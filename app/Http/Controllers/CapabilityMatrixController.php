<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesMachine;
use App\Models\MachineSetupState;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Backs the per-machine capability matrix page.
 *
 * Every state is still one machine_setup_states row. The matrix is only a
 * different way to look at and edit those rows, so the scheduler is untouched.
 * Bulk endpoints exist so painting a row or column is one request, in one
 * transaction, with duplicate protection and an audit snapshot.
 *
 * Anywhere a machine is referenced (URL {machine} or body machine_id) it may be
 * either machine_list.id or machine_num.
 */
class CapabilityMatrixController extends Controller
{
    use ResolvesMachine;

    /** GET /rules/machines/{machine}  ({machine} = id or machine_num) */
    public function page(string $machine)
    {
        $m = $this->resolveMachine($machine);

        return Inertia::render('MachineCapabilities', [
            'machine'  => $m, // frontend should use $m->id for later API calls
            'machines' => DB::connection('qdn_db')->table('machine_list')
                ->select('id', 'machine_num')->orderBy('machine_num')->get(),
        ]);
    }

    /** GET /rules/machines/{machine}/capabilities */
    public function data(string $machine)
    {
        $machineId = $this->resolveMachineId($machine);

        $db = DB::connection('qdn_db');
        $states = $db->table('machine_setup_states')->where('machine_id', $machineId)->get();
        $ids = $states->pluck('setup_state_id');

        $count = fn(string $table, string $col) => $db->table($table)
            ->whereIn($col, $ids)->select($col, DB::raw('count(*) as c'))->groupBy($col)->pluck('c', $col);

        $partRules = $count('machine_capability_part_rules', 'setup_state_id');
        $transIn   = $count('machine_transition_rules', 'to_state_id');
        $excIn     = $count('machine_transition_rule_exceptions', 'to_state_id');

        return response()->json([
            'machine_id' => $machineId,
            'states' => $states->map(fn($s) => (array) $s + [
                'part_rule_count'  => (int) ($partRules[$s->setup_state_id] ?? 0),
                'transition_count' => (int) ($transIn[$s->setup_state_id] ?? 0),
                'exception_count'  => (int) ($excIn[$s->setup_state_id] ?? 0),
            ])->values(),
        ]);
    }

    /** POST /rules/setup-states/bulk -- creates missing states, skips ones that already exist */
    public function bulkStore(Request $request)
    {
        $data = $request->validate([
            'machine_id'                  => 'required', // id or machine_num
            'states'                      => 'required|array|min:1|max:500',
            'states.*.factory'            => 'required|in:F1,F2,F3',
            'states.*.focus_group'        => 'nullable|string|max:50',
            'states.*.lot_type'           => 'nullable|string|max:20',
            'states.*.package_name'       => 'nullable|string|max:50',
            'states.*.body_size'          => 'nullable|string|max:20',
            'states.*.thickness'          => 'nullable|numeric',
            'states.*.leadcount_min'      => 'nullable|integer',
            'states.*.leadcount_max'      => 'nullable|integer',
            'states.*.leadcount_include'  => 'nullable|string|max:255',
            'states.*.leadcount_exclude'  => 'nullable|string|max:50',
            'states.*.process_type'       => 'required|in:taping,tubing,both,tray',
            'states.*.remarks'            => 'nullable|string|max:255',
        ]);

        $machineId = $this->resolveMachineId($data['machine_id']);

        $taken = array_flip(
            MachineSetupState::where('machine_id', $machineId)->get()->map(fn($s) => $this->tupleKey($s))->all()
        );

        $createdIds = [];
        $skipped = 0;

        DB::connection('qdn_db')->transaction(function () use ($data, $machineId, &$taken, &$createdIds, &$skipped) {
            foreach ($data['states'] as $row) {
                $key = $this->tupleKey($row);
                if (isset($taken[$key])) {
                    $skipped++;
                    continue;
                }
                $taken[$key] = true;
                $createdIds[] = MachineSetupState::create($row + ['machine_id' => $machineId])->setup_state_id;
            }
            $this->audit('bulk_create', $machineId, ['created_ids' => $createdIds, 'skipped' => $skipped]);
        });

        return response()->json(['created' => count($createdIds), 'skipped' => $skipped, 'ids' => $createdIds], 201);
    }

    /** PATCH /rules/setup-states/bulk -- change identity fields on many states at once (row edit) */
    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'machine_id'            => 'required', // id or machine_num
            'ids'                   => 'required|array|min:1|max:500',
            'ids.*'                 => 'integer',
            'fields'                => 'required|array',
            'fields.factory'        => 'sometimes|in:F1,F2,F3',
            'fields.package_name'   => 'nullable|string|max:50',
            'fields.body_size'      => 'nullable|string|max:20',
            'fields.thickness'      => 'nullable|numeric',
            'fields.focus_group'    => 'nullable|string|max:50',
            'fields.lot_type'       => 'nullable|string|max:20',
        ]);

        $machineId = $this->resolveMachineId($data['machine_id']);
        $fields = $data['fields'];

        $all = MachineSetupState::where('machine_id', $machineId)->get();
        $targets = $all->whereIn('setup_state_id', $data['ids']);

        if ($targets->isEmpty()) {
            return response()->json(['message' => 'No matching capabilities on this machine.'], 422);
        }

        // Refuse an edit that would make two states identical.
        $taken = array_flip(
            $all->whereNotIn('setup_state_id', $data['ids'])->map(fn($s) => $this->tupleKey($s))->all()
        );
        $collisions = 0;
        foreach ($targets as $s) {
            $key = $this->tupleKey(array_merge($s->toArray(), $fields));
            if (isset($taken[$key])) {
                $collisions++;
            }
            $taken[$key] = true;
        }
        if ($collisions > 0) {
            return response()->json([
                'message' => "{$collisions} capabilit" . ($collisions === 1 ? 'y' : 'ies') . ' would become identical to an existing one. Nothing was changed.',
            ], 422);
        }

        DB::connection('qdn_db')->transaction(function () use ($targets, $fields, $machineId) {
            $this->audit('bulk_update', $machineId, [
                'fields' => $fields,
                'before' => $targets->values()->toArray(),
            ]);
            foreach ($targets as $s) {
                $s->update($fields);
            }
        });

        return response()->json(['updated' => $targets->count()]);
    }

    /** DELETE /rules/setup-states/bulk -- snapshots the states AND everything that cascades with them */
    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'machine_id' => 'required', // id or machine_num
            'ids'        => 'required|array|min:1|max:500',
            'ids.*'      => 'integer',
        ]);

        $machineId = $this->resolveMachineId($data['machine_id']);
        $states = MachineSetupState::where('machine_id', $machineId)->whereIn('setup_state_id', $data['ids'])->get();
        $ids = $states->pluck('setup_state_id')->all();

        if (! $ids) {
            return response()->json(['deleted' => 0]);
        }

        $db = DB::connection('qdn_db');

        $db->transaction(function () use ($db, $states, $ids, $machineId) {
            $this->audit('bulk_delete', $machineId, [
                'states'           => $states->values()->toArray(),
                'part_rules'       => $db->table('machine_capability_part_rules')->whereIn('setup_state_id', $ids)->get(),
                'transition_rules' => $db->table('machine_transition_rules')
                    ->where(fn($q) => $q->whereIn('from_state_id', $ids)->orWhereIn('to_state_id', $ids))->get(),
                'exceptions'       => $db->table('machine_transition_rule_exceptions')
                    ->where(fn($q) => $q->whereIn('from_state_id', $ids)->orWhereIn('to_state_id', $ids))->get(),
                'group_members'    => $db->table('machine_transition_group_members')->whereIn('setup_state_id', $ids)->get(),
            ]);

            MachineSetupState::whereIn('setup_state_id', $ids)->delete(); // FK cascade removes the dependents
        });

        return response()->json(['deleted' => count($ids)]);
    }

    // ---------------------------------------------------------------------

    /** Identity of a state: every column the scheduler matches on. */
    private function tupleKey($s): string
    {
        $s = is_array($s) ? $s : $s->toArray();
        $v = fn(string $k) => isset($s[$k]) && $s[$k] !== '' ? (string) $s[$k] : '';
        $thickness = isset($s['thickness']) && $s['thickness'] !== ''
            ? number_format((float) $s['thickness'], 2, '.', '') : '';

        return implode('|', [
            $v('factory'),
            $v('focus_group'),
            $v('lot_type'),
            $v('package_name'),
            $v('body_size'),
            $thickness,
            $v('leadcount_min'),
            $v('leadcount_max'),
            $v('leadcount_include'),
            $v('leadcount_exclude'),
            $v('process_type'),
        ]);
    }

    private function audit(string $action, int $machineId, array $snapshot): void
    {
        DB::connection('qdn_db')->table('rule_audit_logs')->insert([
            'user_id'    => auth()->id(),
            'action'     => $action,
            'table_name' => 'machine_setup_states',
            'machine_id' => $machineId,
            'snapshot'   => json_encode($snapshot),
            'created_at' => now(),
        ]);
    }
}
