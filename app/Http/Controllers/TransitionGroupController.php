<?php

namespace App\Http\Controllers;

use App\Models\MachineGroupTransitionRule;
use App\Models\MachineTransitionGroup;
use App\Models\MachineTransitionGroupMember;
use App\Services\TransitionGroupResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransitionGroupController extends Controller
{
    private const PALETTE = ['#7F77DD', '#1D9E75', '#D85A30', '#378ADD', '#D4537E', '#BA7517', '#639922', '#888780'];

    /** GET /rules/machines/{machine}/groups */
    public function data(int $machine)
    {
        $groups = MachineTransitionGroup::where('machine_id', $machine)->orderBy('id')->get();
        $members = MachineTransitionGroupMember::whereIn('group_id', $groups->pluck('id'))->get()->groupBy('group_id');

        return response()->json([
            'groups' => $groups->map(fn($g) => [
                'id'         => $g->id,
                'name'       => $g->name,
                'color'      => $g->color,
                'member_ids' => $members->get($g->id, collect())->pluck('setup_state_id')->values(),
            ])->values(),
            'rules' => MachineGroupTransitionRule::where('machine_id', $machine)->get(),
        ]);
    }

    /** POST /rules/machines/{machine}/groups */
    public function storeGroup(Request $request, int $machine)
    {
        $data = $request->validate(['name' => 'required|string|max:60']);
        $this->assertMachine($machine);

        if (MachineTransitionGroup::where('machine_id', $machine)->where('name', $data['name'])->exists()) {
            return response()->json(['message' => 'This machine already has a group with that name.'], 422);
        }

        $used = MachineTransitionGroup::where('machine_id', $machine)->pluck('color')->all();
        $color = collect(self::PALETTE)->first(fn($c) => ! in_array($c, $used))
            ?? self::PALETTE[count($used) % count(self::PALETTE)];

        $group = MachineTransitionGroup::create(['machine_id' => $machine, 'name' => $data['name'], 'color' => $color]);
        $this->audit('create_group', $machine, $group->toArray());

        return response()->json($group, 201);
    }

    /** PATCH /rules/groups/{group} */
    public function updateGroup(Request $request, int $group)
    {
        $g = MachineTransitionGroup::findOrFail($group);
        $data = $request->validate(['name' => 'required|string|max:60']);

        if (MachineTransitionGroup::where('machine_id', $g->machine_id)->where('name', $data['name'])->where('id', '!=', $g->id)->exists()) {
            return response()->json(['message' => 'This machine already has a group with that name.'], 422);
        }

        $this->audit('rename_group', $g->machine_id, ['before' => $g->toArray(), 'name' => $data['name']]);
        $g->update($data);

        return response()->json($g);
    }

    /** DELETE /rules/groups/{group} -- members and the group's cost rules go with it */
    public function destroyGroup(int $group)
    {
        $g = MachineTransitionGroup::findOrFail($group);

        DB::connection('qdn_db')->transaction(function () use ($g) {
            $this->audit('delete_group', $g->machine_id, [
                'group'   => $g->toArray(),
                'members' => MachineTransitionGroupMember::where('group_id', $g->id)->get(),
                'rules'   => MachineGroupTransitionRule::where('from_group_id', $g->id)->orWhere('to_group_id', $g->id)->get(),
            ]);
            $g->delete(); // FK cascade removes members and rules
        });

        return response()->json(['deleted' => true]);
    }

    /** PUT /rules/groups/{group}/members  { add: [stateIds], remove: [stateIds] } */
    public function syncMembers(Request $request, int $group)
    {
        $g = MachineTransitionGroup::findOrFail($group);
        $data = $request->validate([
            'add'      => 'sometimes|array|max:500',
            'add.*'    => 'integer',
            'remove'   => 'sometimes|array|max:500',
            'remove.*' => 'integer',
        ]);

        $add = $data['add'] ?? [];
        $remove = $data['remove'] ?? [];

        // Only states that belong to this group's machine may be added.
        $valid = DB::connection('qdn_db')->table('machine_setup_states')
            ->where('machine_id', $g->machine_id)->whereIn('setup_state_id', $add)->pluck('setup_state_id')->all();

        DB::connection('qdn_db')->transaction(function () use ($g, $valid, $remove) {
            $this->audit('group_members', $g->machine_id, ['group_id' => $g->id, 'add' => $valid, 'remove' => $remove]);
            foreach ($valid as $id) {
                MachineTransitionGroupMember::firstOrCreate(['group_id' => $g->id, 'setup_state_id' => $id]);
            }
            if ($remove) {
                MachineTransitionGroupMember::where('group_id', $g->id)->whereIn('setup_state_id', $remove)->delete();
            }
        });

        return response()->json(['added' => count($valid), 'removed' => count($remove)]);
    }

    /** POST /rules/machines/{machine}/group-rules -- creates or updates the rule between two groups */
    public function saveRule(Request $request, int $machine)
    {
        $data = $request->validate([
            'from_group_id'        => 'required|integer',
            'to_group_id'          => 'required|integer|different:from_group_id',
            'operation_type'       => 'required|in:setup,conversion',
            'est_duration_minutes' => 'required|integer|min:0|max:100000',
            'symmetric'            => 'sometimes|boolean',
            'notes'                => 'nullable|string|max:255',
        ]);

        $count = MachineTransitionGroup::where('machine_id', $machine)
            ->whereIn('id', [$data['from_group_id'], $data['to_group_id']])->count();
        abort_unless($count === 2, 422, 'Both groups must belong to this machine.');

        // One rule per pair of groups, whichever direction it was first saved in.
        $existing = MachineGroupTransitionRule::where('machine_id', $machine)
            ->where(fn($q) => $q
                ->where(fn($w) => $w->where('from_group_id', $data['from_group_id'])->where('to_group_id', $data['to_group_id']))
                ->orWhere(fn($w) => $w->where('from_group_id', $data['to_group_id'])->where('to_group_id', $data['from_group_id'])))
            ->first();

        $payload = $data + ['symmetric' => true, 'machine_id' => $machine];

        $this->audit('save_group_rule', $machine, ['before' => $existing?->toArray(), 'after' => $payload]);

        if ($existing) {
            $existing->update(collect($payload)->except(['from_group_id', 'to_group_id'])->all());

            return response()->json($existing->fresh());
        }

        return response()->json(MachineGroupTransitionRule::create($payload), 201);
    }

    /** DELETE /rules/group-rules/{rule} */
    public function destroyRule(int $rule)
    {
        $r = MachineGroupTransitionRule::findOrFail($rule);
        $this->audit('delete_group_rule', $r->machine_id, $r->toArray());
        $r->delete();

        return response()->json(['deleted' => true]);
    }

    /** GET /rules/machines/{machine}/pair-cost?from=&to= -- uses the same resolver as the scheduler */
    public function pairCost(Request $request, int $machine)
    {
        $data = $request->validate(['from' => 'required|integer', 'to' => 'required|integer']);
        $db = DB::connection('qdn_db');

        if ($data['from'] === $data['to']) {
            return response()->json(['kind' => 'free', 'message' => 'Same state: free.']);
        }

        $exact = $db->table('machine_transition_rules')
            ->where('machine_id', $machine)->where('from_state_id', $data['from'])->where('to_state_id', $data['to'])->first();
        if ($exact) {
            return response()->json([
                'kind'    => 'pair',
                'message' => "A pair rule for exactly these two states applies: {$exact->operation_type}, " . ($exact->est_duration_minutes ?? 0) . ' min. Pair rules win over groups.',
            ]);
        }

        $groups = MachineTransitionGroup::where('machine_id', $machine)->get()->keyBy('id');
        $members = MachineTransitionGroupMember::whereIn('group_id', $groups->keys())->get();
        $byState = $members->groupBy('setup_state_id')->map(fn($m) => $m->pluck('group_id')->all());
        $sizes = $members->groupBy('group_id')->map->count()->all();
        $rules = MachineGroupTransitionRule::where('machine_id', $machine)->get();

        $fromGroups = $byState[$data['from']] ?? [];
        $toGroups = $byState[$data['to']] ?? [];
        $names = fn(array $ids) => collect($ids)->map(fn($id) => $groups[$id]->name ?? '?')->implode(', ');

        $res = TransitionGroupResolver::resolve($fromGroups, $toGroups, $rules, $sizes);

        if ($res === null) {
            $why = ! $fromGroups || ! $toGroups
                ? 'One of these states is in no group'
                : 'There is no cost rule between ' . $names($fromGroups) . ' and ' . $names($toGroups);

            return response()->json([
                'kind'    => 'none',
                'message' => "{$why}, so the machine's other rules decide (axis rules, pair rules, then the 240 min default).",
            ]);
        }

        if ($res['kind'] === 'free') {
            return response()->json(['kind' => 'free', 'message' => 'Free: both are in ' . $names($res['shared']) . '.']);
        }

        $r = $res['rule'];

        return response()->json([
            'kind'    => 'rule',
            'message' => ucfirst($r->operation_type) . ", {$r->est_duration_minutes} min, from the rule "
                . ($groups[$r->from_group_id]->name ?? '?') . ' ' . ($r->symmetric ? '↔' : '→') . ' ' . ($groups[$r->to_group_id]->name ?? '?') . '.',
        ]);
    }

    // ---------------------------------------------------------------------

    private function assertMachine(int $machine): void
    {
        abort_unless(DB::connection('qdn_db')->table('machine_list')->where('id', $machine)->exists(), 404);
    }

    private function audit(string $action, ?int $machineId, $snapshot): void
    {
        DB::connection('qdn_db')->table('rule_audit_logs')->insert([
            'user_id'    => auth()->id(),
            'action'     => $action,
            'table_name' => 'machine_transition_groups',
            'machine_id' => $machineId,
            'snapshot'   => json_encode($snapshot),
            'created_at' => now(),
        ]);
    }
}
