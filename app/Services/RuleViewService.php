<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Nested, filterable view of the scheduling rules:
 *   machine -> capabilities (setup states) -> part rules / transition costs / exceptions
 * plus machine-level rules and a "health" list of things worth fixing.
 *
 * IMPORTANT: matchState() mirrors how the scheduler decides eligibility.
 * It is a COPY of that logic. Replace the body of matchState() with a call
 * to SchedulerService's own matcher as soon as possible so this page can
 * never disagree with what the scheduler actually does.
 */
class RuleViewService
{
    private const PROCESS_MAP = [
        'taping' => ['taping', 'both'],
        'tubing' => ['tubing', 'both'],
        'tray'   => ['tray'],
        'both'   => ['both'],
    ];

    /** Datalist options for the package filter (packages + group names). */
    public function packageOptions(): array
    {
        $db = DB::connection('qdn_db');

        $names = $db->table('machine_setup_states')->whereNotNull('package_name')->pluck('package_name')
            ->merge($db->table('package_groups')->pluck('package_name'))
            ->merge($db->table('package_groups')->pluck('group_name'))
            ->unique()->sort()->values()->all();

        return ['options' => $names];
    }

    /**
     * @param array $f keys: machine, package, process, factory, leadcount, part
     */
    public function getMachineView(array $f = []): array
    {
        $f = array_filter(
            array_map(fn($v) => is_string($v) ? trim($v) : $v, $f),
            fn($v) => $v !== null && $v !== ''
        );

        $db = DB::connection('qdn_db');
        $machines    = $db->table('machine_list')->select('id', 'machine_num', 'factory')->orderBy('machine_num')->get();
        $states      = $db->table('machine_setup_states')->get();
        $partRules   = $db->table('machine_capability_part_rules')->get();
        $transitions = $db->table('machine_transition_rules')->get();
        $exceptions  = $db->table('machine_transition_rule_exceptions')->get();
        $axis        = $db->table('machine_transition_axis_rules')->get();
        $auto        = $db->table('machine_auto_part_rules')->get();
        $focus       = $db->table('machine_focus_group_rules')->get();
        $exclusions  = $db->table('machine_part_exclusions')->get();

        $stateById        = $states->keyBy('setup_state_id');
        $statesByMachine  = $states->groupBy('machine_id');
        $partRulesByState = $partRules->groupBy('setup_state_id');
        $transByTo        = $transitions->groupBy('to_state_id');
        $excByTo          = $exceptions->groupBy('to_state_id');
        $axisByMachine    = $axis->groupBy('machine_id');
        $autoByMachine    = $auto->groupBy('machine_id');
        $focusByMachine   = $focus->groupBy('machine_id');
        $exclByMachine    = $exclusions->groupBy('machine_id');

        // ---- filter context -------------------------------------------------
        $pk = $this->resolvePackages($f['package'] ?? null);

        $partStateIds = [];
        if (isset($f['part'])) {
            $partStateIds = $partRules
                ->filter(fn($r) => $this->partMatches($r, $f['part']))
                ->pluck('setup_state_id')->unique()->all();
        }

        $filterKeys = ['package', 'process', 'factory', 'leadcount', 'part'];
        $hasFilter  = (bool) array_intersect_key($f, array_flip($filterKeys));

        // ---- build machine cards -------------------------------------------
        $out = [];
        $excludedFor = [];

        foreach ($machines as $m) {
            if (isset($f['machine']) && stripos($m->machine_num, $f['machine']) === false) {
                continue;
            }

            $machineExclusions = $exclByMachine->get($m->id, collect());
            if (isset($f['part']) && $machineExclusions->contains(
                fn($e) => mb_strtolower($e->part_name) === mb_strtolower($f['part'])
            )) {
                $excludedFor[] = $m->machine_num;
                continue;
            }

            $cards = [];
            foreach ($statesByMachine->get($m->id, collect()) as $s) {
                $match = $this->matchState($s, $f, $pk, $partStateIds);
                if ($match === null) {
                    continue;
                }
                $cards[] = $this->shapeState($s, $match, $partRulesByState, $transByTo, $excByTo, $stateById);
            }

            if ($hasFilter && ! $cards) {
                continue;
            }

            $out[] = [
                'id'                => $m->id,
                'machine_num'       => $m->machine_num,
                'factory'           => $m->factory,
                'states'            => $cards,
                'axis_rules'        => $axisByMachine->get($m->id, collect())->values()->all(),
                'auto_part_rules'   => $autoByMachine->get($m->id, collect())->values()->all(),
                'focus_group_rules' => $focusByMachine->get($m->id, collect())->values()->all(),
                'part_exclusions'   => $machineExclusions->values()->all(),
            ];
        }

        return [
            'context' => [
                'package'           => $f['package'] ?? null,
                'groups'            => $pk['groups'],
                'part'              => $f['part'] ?? null,
                'part_override'     => isset($f['part']) && count($partStateIds) > 0,
                'excluded_machines' => $excludedFor,
            ],
            'health'   => $this->health($machines, $states, $transitions, $axis),
            'machines' => $out,
        ];
    }

    // =====================================================================
    // Matching
    // =====================================================================

    /** Returns null (no match) or: any | direct | group | wildcard | part rule */
    private function matchState(object $s, array $f, array $pk, array $partStateIds): ?string
    {
        if (isset($f['factory']) && $s->factory !== $f['factory']) {
            return null; // factory is always enforced, even for part-rule overrides
        }

        // A part with any rule row is routed ONLY to the states its rules name.
        if (isset($f['part']) && $partStateIds) {
            return in_array($s->setup_state_id, $partStateIds) ? 'part rule' : null;
        }

        if (isset($f['process'])) {
            $allowed = self::PROCESS_MAP[$f['process']] ?? [$f['process']];
            if (! in_array($s->process_type, $allowed, true)) {
                return null;
            }
        }

        if (isset($f['leadcount']) && ! $this->leadcountOk($s, (int) $f['leadcount'])) {
            return null;
        }

        if (! isset($f['package'])) {
            return 'any';
        }

        if ($s->package_name === null) {
            return 'wildcard';
        }
        $pkg = $this->norm($s->package_name);
        if (in_array($pkg, $pk['direct_norm'], true)) {
            return 'direct';
        }
        if (in_array($pkg, $pk['group_norm'], true)) {
            return 'group';
        }

        return null;
    }

    private function resolvePackages(?string $input): array
    {
        $empty = ['direct_norm' => [], 'group_norm' => [], 'groups' => []];
        if (! $input) {
            return $empty;
        }

        $pg = DB::connection('qdn_db')->table('package_groups')->get();
        $in = $this->norm($input);

        // Input may be a group name OR a package name.
        $groupNames = $pg->filter(fn($r) => $this->norm($r->group_name) === $in || $this->norm($r->package_name) === $in)
            ->pluck('group_name')->unique()->values();

        $groups = $groupNames->map(fn($g) => [
            'group_name' => $g,
            'members'    => $pg->where('group_name', $g)->pluck('package_name')->unique()->values()->all(),
        ])->all();

        $isGroupName = $pg->contains(fn($r) => $this->norm($r->group_name) === $in);
        $members = collect($groups)->pluck('members')->flatten()->map(fn($p) => $this->norm($p))->unique();

        return [
            'direct_norm' => $isGroupName ? [] : [$in],
            'group_norm'  => $members->reject(fn($p) => $p === $in)->values()->all(),
            'groups'      => $groups,
        ];
    }

    private function partMatches(object $rule, string $part): bool
    {
        $v = mb_strtolower($rule->match_value);
        $p = mb_strtolower($part);

        // NOTE: match types other than these (e.g. dedicated_list) are not handled here.
        return match ($rule->match_type) {
            'exact'    => $p === $v,
            'contains' => str_contains($p, $v),
            'suffix'   => str_ends_with($p, $v),
            default    => false,
        };
    }

    private function leadcountOk(object $s, int $lc): bool
    {
        if ($s->leadcount_include !== null && $s->leadcount_include !== '') {
            return in_array($lc, $this->csvInts($s->leadcount_include), true);
        }
        if ($s->leadcount_min !== null && $lc < $s->leadcount_min) {
            return false;
        }
        if ($s->leadcount_max !== null && $lc > $s->leadcount_max) {
            return false;
        }
        if ($s->leadcount_exclude !== null && in_array($lc, $this->csvInts($s->leadcount_exclude), true)) {
            return false;
        }

        return true;
    }

    private function csvInts($csv): array
    {
        return array_map('intval', array_filter(array_map('trim', explode(',', (string) $csv)), 'strlen'));
    }

    private function norm($v): string
    {
        return mb_strtolower(trim((string) $v));
    }

    // =====================================================================
    // Shaping
    // =====================================================================

    private function leadcountText(object $s): string
    {
        if ($s->leadcount_include !== null && $s->leadcount_include !== '') {
            return "only {$s->leadcount_include}";
        }
        if ($s->leadcount_min === null && $s->leadcount_max === null) {
            return 'any';
        }
        $t = ($s->leadcount_min ?? 'any') . '–' . ($s->leadcount_max ?? 'any');
        if ($s->leadcount_exclude !== null && $s->leadcount_exclude !== '') {
            $t .= " except {$s->leadcount_exclude}";
        }

        return $t;
    }

    private function shortLabel(?object $s): string
    {
        if (! $s) {
            return 'unknown state';
        }

        return ($s->package_name ?? 'ANY pkg') . ' / ' . ($s->body_size ?? 'any size')
            . ' / LC ' . $this->leadcountText($s) . ' / ' . $s->process_type;
    }

    private function shapeState(object $s, string $match, Collection $partRulesByState, Collection $transByTo, Collection $excByTo, Collection $stateById): array
    {
        $id = $s->setup_state_id;
        $fromLabel = fn($r) => $r->from_state_id ? $this->shortLabel($stateById->get($r->from_state_id)) : 'ANY state';

        return [
            'id'             => $id,
            'machine_id'     => $s->machine_id,
            'factory'        => $s->factory,
            'package_name'   => $s->package_name,
            'body_size'      => $s->body_size,
            'thickness'      => $s->thickness,
            'leadcount_text' => $this->leadcountText($s),
            'process_type'   => $s->process_type,
            'remarks'        => $s->remarks,
            'match'          => $match,
            'raw'            => $s, // prefill for the edit form
            'part_rules'     => $partRulesByState->get($id, collect())->values()->all(),
            'transitions_in' => $transByTo->get($id, collect())
                ->map(fn($t) => (array) $t + ['from_label' => $fromLabel($t)])->values()->all(),
            'exceptions_in'  => $excByTo->get($id, collect())
                ->map(fn($e) => (array) $e + ['from_label' => $fromLabel($e)])->values()->all(),
        ];
    }

    // =====================================================================
    // Health (always computed on the full, unfiltered data)
    // =====================================================================

    private function health(Collection $machines, Collection $states, Collection $transitions, Collection $axis): array
    {
        $num = $machines->pluck('machine_num', 'id');
        $withStates = $states->pluck('machine_id')->unique();
        $toIds = $transitions->pluck('to_state_id')->unique();

        $dupes = $transitions
            ->groupBy(fn($t) => $t->machine_id . '|' . ($t->from_state_id ?? 'any') . '|' . $t->to_state_id)
            ->filter(fn($g) => $g->count() > 1)
            ->map(fn($g) => $num->get($g->first()->machine_id) . ' → state #' . $g->first()->to_state_id . " ({$g->count()} rules)")
            ->values()->all();

        $mixed = $axis->groupBy('machine_id')
            ->filter(fn($g) => $g->pluck('combination_rule')->unique()->count() > 1)
            ->map(fn($g, $mid) => $num->get($mid))->values()->all();

        $issues = [
            [
                'key' => 'no_states',
                'label' => 'Machines with no capabilities',
                'items' => $machines->reject(fn($m) => $withStates->contains($m->id))->pluck('machine_num')->values()->all()
            ],
            [
                'key' => 'wildcard',
                'label' => 'Wildcard capabilities (any package + any body size)',
                'items' => $states->filter(fn($s) => $s->package_name === null && $s->body_size === null)
                    ->map(fn($s) => $num->get($s->machine_id) . " (state #{$s->setup_state_id})")->values()->all()
            ],
            [
                'key' => 'no_costs',
                'label' => 'Capabilities with no transition rule into them',
                'items' => $states->reject(fn($s) => $toIds->contains($s->setup_state_id))
                    ->map(fn($s) => $num->get($s->machine_id) . ' — ' . $this->shortLabel($s))->values()->all()
            ],
            ['key' => 'dupes', 'label' => 'Duplicate transition rules', 'items' => $dupes],
            ['key' => 'mixed', 'label' => 'Machines mixing max and sum axis rules', 'items' => $mixed],
        ];

        return array_values(array_filter($issues, fn($i) => count($i['items']) > 0));
    }
}
