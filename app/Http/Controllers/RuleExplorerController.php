<?php

namespace App\Http\Controllers;

use App\Models\MachineAutoPartRule;
use App\Models\MachineFocusGroupRule;
use App\Models\MachinePartExclusion;
use App\Models\PackageGroupLoadingPlan;
use App\Services\RuleExplorerService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use App\Models\MachineCapabilityPartRule;
use App\Models\MachineSetupState;
use App\Models\MachineTransitionAxisRule;
use App\Models\MachineTransitionRule;
use App\Models\MachineTransitionRuleException;

class RuleExplorerController extends Controller
{
    public function __construct(protected RuleExplorerService $service) {}

    /** GET /rules -- the dashboard page */
    public function index()
    {
        // return Inertia::render('LoadingPlanRulesDashboard');
        return Inertia::render('LoadingPlanRulesDashboard', [
            'rules' => $this->service->getAllRules(),
            'machines' => $this->machineList()->getData(true),
        ]);
    }

    public function data(Request $request)
    {
        return response()->json($this->service->getAllRules($request->query('machine')));
    }

    public function packageGroups()
    {
        return response()->json($this->service->getPackageGroups());
    }

    /** GET /rules/machines -- for populating machine pickers in forms */
    public function machineList()
    {
        return response()->json(
            DB::connection('qdn_db')->table('machine_list')->select('id', 'machine_num')->orderBy('machine_num')->get()
        );
    }

    /** GET /rules/setup-states?machine_id= -- for populating from/to state pickers */
    public function setupStatesForMachine(Request $request)
    {
        $machineId = $request->query('machine_id');
        $query = MachineSetupState::query();
        if ($machineId) {
            $query->where('machine_id', $machineId);
        }
        return response()->json($query->orderBy('package_name')->get());
    }

    // =================================================================
    // machine_setup_states -- WARNING FLAGS surfaced to the client:
    //  - package_name=NULL + body_size=NULL is the "wildcard hazard"
    //    (accidentally matches everything on that factory) unless this
    //    machine truly has no other capability at all (RES/CFCR pattern)
    //  - creating this state does NOT auto-create transition rules;
    //    the client should prompt "does this need transition rules too?"
    // =================================================================
    public function storeSetupState(Request $request)
    {
        $data = $request->validate([
            'machine_id' => 'required|integer',
            'factory' => 'required|in:F1,F2,F3',
            'package_name' => 'nullable|string|max:50',
            'body_size' => 'nullable|string|max:20',
            'thickness' => 'nullable|numeric',
            'leadcount_min' => 'nullable|integer',
            'leadcount_max' => 'nullable|integer',
            'leadcount_exclude' => 'nullable|string|max:50',
            'leadcount_include' => 'nullable|string|max:255',
            'process_type' => 'required|in:taping,tubing,both,tray',
            'remarks' => 'nullable|string|max:255',
        ]);

        $warnings = [];
        if (is_null($data['package_name'] ?? null) && is_null($data['body_size'] ?? null)) {
            $warnings[] = 'package_name AND body_size are both empty -- this state will match ANY package/body on this factory. Only correct for fully-dedicated machines (RES/CFCR pattern).';
        }

        $state = MachineSetupState::create($data);

        return response()->json(['state' => $state, 'warnings' => $warnings], 201);
    }

    public function updateSetupState(Request $request, int $id)
    {
        $state = MachineSetupState::findOrFail($id);
        $data = $request->validate([
            'factory' => 'sometimes|in:F1,F2,F3',
            'package_name' => 'nullable|string|max:50',
            'body_size' => 'nullable|string|max:20',
            'thickness' => 'nullable|numeric',
            'leadcount_min' => 'nullable|integer',
            'leadcount_max' => 'nullable|integer',
            'leadcount_exclude' => 'nullable|string|max:50',
            'leadcount_include' => 'nullable|string|max:255',
            'process_type' => 'sometimes|in:taping,tubing,both,tray',
            'remarks' => 'nullable|string|max:255',
        ]);
        $state->update($data);
        return response()->json($state);
    }

    public function destroySetupState(int $id)
    {
        // ON DELETE CASCADE handles machine_transition_rules,
        // machine_capability_part_rules, machine_transition_rule_exceptions
        // referencing this state -- deleting here removes those too.
        MachineSetupState::findOrFail($id)->delete();
        return response()->json(['deleted' => true, 'note' => 'Cascaded to any transition rules / part rules referencing this state.']);
    }

    // =================================================================
    // machine_transition_rules
    // =================================================================
    public function storeTransitionRule(Request $request)
    {
        $data = $request->validate([
            'machine_id' => 'required|integer',
            'from_state_id' => 'nullable|integer',
            'to_state_id' => 'required|integer',
            'operation_type' => 'required|in:none,conversion,setup',
            'est_duration_minutes' => 'nullable|integer',
            'notes' => 'nullable|string|max:255',
        ]);
        return response()->json(MachineTransitionRule::create($data), 201);
    }

    public function updateTransitionRule(Request $request, int $id)
    {
        $rule = MachineTransitionRule::findOrFail($id);
        $data = $request->validate([
            'operation_type' => 'sometimes|in:none,conversion,setup',
            'est_duration_minutes' => 'nullable|integer',
            'notes' => 'nullable|string|max:255',
        ]);
        $rule->update($data);
        return response()->json($rule);
    }

    public function destroyTransitionRule(int $id)
    {
        MachineTransitionRule::findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }

    // =================================================================
    // machine_capability_part_rules
    // =================================================================
    public function storePartRule(Request $request)
    {
        $data = $request->validate([
            'setup_state_id' => 'required|integer',
            'match_type' => 'required|in:exact,contains,suffix',
            'match_value' => 'required|string|max:100',
        ]);

        $warnings = [];
        if ($data['match_type'] !== 'exact') {
            $warnings[] = 'Non-exact matching (contains/suffix) can accidentally match unintended part names -- double-check match_value is specific enough.';
        }

        return response()->json(['rule' => MachineCapabilityPartRule::create($data), 'warnings' => $warnings], 201);
    }

    public function destroyPartRule(int $id)
    {
        MachineCapabilityPartRule::findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }

    // =================================================================
    // machine_transition_axis_rules
    // =================================================================
    public function storeAxisRule(Request $request)
    {
        $data = $request->validate([
            'machine_id' => 'required|integer',
            'axis' => 'required|in:factory,package_group,leadcount',
            'operation_type' => 'required|in:setup,conversion',
            'est_duration_minutes' => 'required|integer',
            'combination_rule' => 'required|in:max,sum',
        ]);

        $existingForMachine = MachineTransitionAxisRule::where('machine_id', $data['machine_id'])->first();
        $warnings = [];
        if ($existingForMachine && $existingForMachine->combination_rule !== $data['combination_rule']) {
            $warnings[] = "This machine's existing axis rules use combination_rule='{$existingForMachine->combination_rule}' -- mixing values on one machine is undefined behavior.";
        }

        return response()->json(['rule' => MachineTransitionAxisRule::create($data), 'warnings' => $warnings], 201);
    }

    public function destroyAxisRule(int $id)
    {
        MachineTransitionAxisRule::findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }

    // =================================================================
    // machine_transition_rule_exceptions
    // =================================================================
    public function storeTransitionException(Request $request)
    {
        $data = $request->validate([
            'machine_id' => 'required|integer',
            'part_name' => 'required|string|max:100',
            'from_state_id' => 'nullable|integer',
            'to_state_id' => 'required|integer',
            'operation_type' => 'required|in:none,conversion,setup',
            'est_duration_minutes' => 'nullable|integer',
            'notes' => 'nullable|string|max:255',
        ]);
        return response()->json(MachineTransitionRuleException::create($data), 201);
    }

    public function destroyTransitionException(int $id)
    {
        MachineTransitionRuleException::findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }

    // =================================================================
    // Flat/independent tables
    // =================================================================
    public function storeAutoPartRule(Request $request)
    {
        $data = $request->validate([
            'machine_id' => 'required|integer',
            'package_name' => 'nullable|string|max:50',
            'rule_type' => 'required|in:exclude,include_only',
            'notes' => 'nullable|string|max:255',
        ]);
        return response()->json(MachineAutoPartRule::create($data), 201);
    }

    public function storeFocusGroupRule(Request $request)
    {
        $data = $request->validate([
            'machine_id' => 'required|integer',
            'focus_group' => 'required|string|max:10',
            'rule_type' => 'required|in:exclude,include_only',
            'notes' => 'nullable|string|max:255',
        ]);
        return response()->json(MachineFocusGroupRule::create($data), 201);
    }

    public function storePartExclusion(Request $request)
    {
        $data = $request->validate([
            'machine_id' => 'required|integer',
            'part_name' => 'required|string|max:100',
            'notes' => 'nullable|string|max:255',
        ]);
        return response()->json(MachinePartExclusion::create($data), 201);
    }

    public function storePackageGroup(Request $request)
    {
        $data = $request->validate([
            'group_name' => 'required|string|max:30',
            'package_name' => 'required|string|max:50',
        ]);
        return response()->json(PackageGroupLoadingPlan::create($data), 201);
    }

    /** Generic delete for the flat tables */
    public function destroyRule(string $table, int $id)
    {
        $allowed = ['machine_auto_part_rules', 'machine_focus_group_rules', 'machine_part_exclusions', 'package_groups'];
        abort_unless(in_array($table, $allowed, true), 403);
        DB::connection('qdn_db')->table($table)->where('id', $id)->delete();
        return response()->json(['deleted' => true]);
    }
}
