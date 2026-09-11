<?php

namespace Tests\Unit\Scheduling;

use App\Models\MachineSetupState;
use App\Models\MachineTransitionRule;
use App\Models\MachineCapabilityPartRule;
use App\Services\SchedulerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests ONLY rankCandidatesForLot() and its dependencies — never calls
 * applyPlacement/commitPickupBatch/greedyPlaceTier/rebuildForPickupArrival,
 * so no row is ever written to loading_plan_entries. This isolates
 * "did the scheduler pick the right machine/state" from "did the
 * insertion mechanics work."
 *
 * Prerequisite: a testing DB connection configured for BOTH the default
 * connection and qdn_db (e.g. sqlite ':memory:' for each in
 * phpunit.xml / config/database.php's testing env). estimateCommit()
 * still hits PartName for real, so a minimal seeded row is needed per
 * test lot — this is a DB-backed test, just never an insertion test.
 */
class SchedulerServiceRankingTest extends TestCase
{
    use RefreshDatabase;

    /** Injects $ref directly, bypassing preloadReferenceData()'s DB query entirely. */
    protected function injectRef(SchedulerService $service, array $ref): void
    {
        $reflection = new \ReflectionClass($service);
        $property = $reflection->getProperty('ref');
        $property->setAccessible(true);
        $property->setValue($service, $ref);
    }

    protected function makeSetupState(array $attrs): MachineSetupState
    {
        $state = new MachineSetupState();
        foreach ($attrs as $key => $value) {
            $state->{$key} = $value;
        }
        return $state;
    }

    protected function makeTransitionRule(array $attrs): MachineTransitionRule
    {
        $rule = new MachineTransitionRule();
        foreach ($attrs as $key => $value) {
            $rule->{$key} = $value;
        }
        return $rule;
    }

    protected function makePartRule(array $attrs): MachineCapabilityPartRule
    {
        $rule = new MachineCapabilityPartRule();
        foreach ($attrs as $key => $value) {
            $rule->{$key} = $value;
        }
        return $rule;
    }

    protected function makeLot(array $attrs): object
    {
        return (object) array_merge([
            'Part_Name' => 'TEST-PART',
            'Package_Name' => null,
            'Qty' => 1000,
            'Lead_Count' => null,
            'Body_Size' => null,
            'Focus_Group' => 'INT',
            'Ramp_Time' => 'PCKTTAPE7',
            'CR3' => null,
        ], $attrs);
    }

    /** @test */
    public function it_picks_the_free_transition_over_a_costly_one_on_the_only_candidate_machine()
    {
        $service = new SchedulerService();

        $state = $this->makeSetupState([
            'setup_state_id' => 1,
            'machine_id' => 100,
            'factory' => 'F1',
            'package_name' => 'LFCSP',
            'body_size' => '6X6',
            'thickness' => null,
            'leadcount_min' => null,
            'leadcount_max' => null,
            'leadcount_exclude' => null,
            'process_type' => 'taping',
        ]);

        $this->injectRef($service, [
            'setup_states' => collect([$state]),
            'part_rules_by_state' => collect(),
            'dedicated_parts' => collect(),
            'transition_rules_by_machine' => collect([
                100 => collect([
                    $this->makeTransitionRule([
                        'rule_id' => 1,
                        'machine_id' => 100,
                        'from_state_id' => null,
                        'to_state_id' => 1,
                        'operation_type' => 'none',
                        'est_duration_minutes' => 0,
                    ]),
                ]),
            ]),
        ]);

        // seed the PartName row estimateCommit() will query for real
        \App\Models\PartName::create(['devicename' => 'TEST-PART', 'recipe' => 50]);

        $lot = $this->makeLot(['Package_Name' => 'LFCSP', 'Body_Size' => '6X6', 'Lead_Count' => 8]);

        $choice = $service->rankCandidatesForLot(
            $lot,
            collect(),
            collect([100 => null]),
            collect([100 => 999999])
        );

        $this->assertNotNull($choice);
        $this->assertSame(100, $choice['machine_id']);
        $this->assertSame('none', $choice['operation_type']);
    }

    /** @test */
    public function it_rejects_a_machine_whose_leadcount_exclude_matches()
    {
        $service = new SchedulerService();

        $state = $this->makeSetupState([
            'setup_state_id' => 1,
            'machine_id' => 100,
            'factory' => 'F2',
            'package_name' => 'QFN',
            'body_size' => '4X4',
            'thickness' => null,
            'leadcount_min' => null,
            'leadcount_max' => null,
            'leadcount_exclude' => '12',
            'process_type' => 'taping',
        ]);

        $this->injectRef($service, [
            'setup_states' => collect([$state]),
            'part_rules_by_state' => collect(),
            'dedicated_parts' => collect(),
            'transition_rules_by_machine' => collect(),
        ]);

        \App\Models\PartName::create(['devicename' => 'TEST-PART', 'recipe' => 50]);

        $lot = $this->makeLot([
            'Package_Name' => 'QFN',
            'Body_Size' => '4X4',
            'Lead_Count' => 12,
            'Focus_Group' => 'LT',
        ]);

        $choice = $service->rankCandidatesForLot(
            $lot,
            collect(),
            collect([100 => null]),
            collect([100 => 999999])
        );

        $this->assertNull($choice, 'leadcount 12 should be excluded, no candidate should survive');
    }

    /** @test */
    public function it_accepts_leadcount_14_on_the_same_machine_that_excludes_12()
    {
        $service = new SchedulerService();

        $state = $this->makeSetupState([
            'setup_state_id' => 1,
            'machine_id' => 100,
            'factory' => 'F2',
            'package_name' => 'QFN',
            'body_size' => '4X4',
            'thickness' => null,
            'leadcount_min' => null,
            'leadcount_max' => null,
            'leadcount_exclude' => '12',
            'process_type' => 'taping',
        ]);

        $this->injectRef($service, [
            'setup_states' => collect([$state]),
            'part_rules_by_state' => collect(),
            'dedicated_parts' => collect(),
            'transition_rules_by_machine' => collect(),
        ]);

        \App\Models\PartName::create(['devicename' => 'TEST-PART', 'recipe' => 50]);

        $lot = $this->makeLot([
            'Package_Name' => 'QFN',
            'Body_Size' => '4X4',
            'Lead_Count' => 14,
            'Focus_Group' => 'LT',
        ]);

        $choice = $service->rankCandidatesForLot(
            $lot,
            collect(),
            collect([100 => null]),
            collect([100 => 999999])
        );

        $this->assertNotNull($choice, 'leadcount 14 is not excluded, should match');
        $this->assertSame(100, $choice['machine_id']);
    }

    /** @test */
    public function it_rejects_a_gated_state_when_part_name_does_not_satisfy_the_rule()
    {
        $service = new SchedulerService();

        $state = $this->makeSetupState([
            'setup_state_id' => 1,
            'machine_id' => 100,
            'factory' => 'F1',
            'package_name' => 'LGA',
            'body_size' => '3X3',
            'thickness' => null,
            'leadcount_min' => null,
            'leadcount_max' => null,
            'leadcount_exclude' => null,
            'process_type' => 'taping',
        ]);

        $this->injectRef($service, [
            'setup_states' => collect([$state]),
            'part_rules_by_state' => collect([
                1 => collect([
                    $this->makePartRule(['rule_id' => 1, 'setup_state_id' => 1, 'match_type' => 'contains', 'match_value' => 'ADRF']),
                ]),
            ]),
            'dedicated_parts' => collect(),
            'transition_rules_by_machine' => collect(),
        ]);

        \App\Models\PartName::create(['devicename' => 'GENERIC-PART', 'recipe' => 50]);

        $lot = $this->makeLot([
            'Part_Name' => 'GENERIC-PART',
            'Package_Name' => 'LGA',
            'Body_Size' => '3X3',
        ]);

        $choice = $service->rankCandidatesForLot(
            $lot,
            collect(),
            collect([100 => null]),
            collect([100 => 999999])
        );

        $this->assertNull($choice, 'part_name without ADRF should fail the gate');
    }

    /** @test */
    public function it_accepts_a_gated_state_when_part_name_satisfies_the_rule()
    {
        $service = new SchedulerService();

        $state = $this->makeSetupState([
            'setup_state_id' => 1,
            'machine_id' => 100,
            'factory' => 'F1',
            'package_name' => 'LGA',
            'body_size' => '3X3',
            'thickness' => null,
            'leadcount_min' => null,
            'leadcount_max' => null,
            'leadcount_exclude' => null,
            'process_type' => 'taping',
        ]);

        $this->injectRef($service, [
            'setup_states' => collect([$state]),
            'part_rules_by_state' => collect([
                1 => collect([
                    $this->makePartRule(['rule_id' => 1, 'setup_state_id' => 1, 'match_type' => 'contains', 'match_value' => 'ADRF']),
                ]),
            ]),
            'dedicated_parts' => collect(),
            'transition_rules_by_machine' => collect(),
        ]);

        \App\Models\PartName::create(['devicename' => 'ADRF-PART', 'recipe' => 50]);

        $lot = $this->makeLot([
            'Part_Name' => 'ADRF-PART',
            'Package_Name' => 'LGA',
            'Body_Size' => '3X3',
        ]);

        $choice = $service->rankCandidatesForLot(
            $lot,
            collect(),
            collect([100 => null]),
            collect([100 => 999999])
        );

        $this->assertNotNull($choice, 'part_name containing ADRF should satisfy the gate');
    }

    /** @test */
    public function it_returns_null_when_no_candidate_machine_has_capacity()
    {
        $service = new SchedulerService();

        $state = $this->makeSetupState([
            'setup_state_id' => 1,
            'machine_id' => 100,
            'factory' => 'F1',
            'package_name' => 'LFCSP',
            'body_size' => '6X6',
            'thickness' => null,
            'leadcount_min' => null,
            'leadcount_max' => null,
            'leadcount_exclude' => null,
            'process_type' => 'taping',
        ]);

        $this->injectRef($service, [
            'setup_states' => collect([$state]),
            'part_rules_by_state' => collect(),
            'dedicated_parts' => collect(),
            'transition_rules_by_machine' => collect(),
        ]);

        \App\Models\PartName::create(['devicename' => 'TEST-PART', 'recipe' => 50]);

        $lot = $this->makeLot(['Package_Name' => 'LFCSP', 'Body_Size' => '6X6']);

        // remaining capacity explicitly null = "no capacity row configured"
        $choice = $service->rankCandidatesForLot(
            $lot,
            collect(),
            collect([100 => null]),
            collect([100 => null])
        );

        $this->assertNull($choice);
    }

    /** @test */
    public function it_prefers_the_machine_with_the_free_transition_over_the_cheaper_but_nonzero_one()
    {
        $service = new SchedulerService();

        $stateA = $this->makeSetupState([
            'setup_state_id' => 1,
            'machine_id' => 100,
            'factory' => 'F1',
            'package_name' => 'LFCSP',
            'body_size' => '6X6',
            'thickness' => null,
            'leadcount_min' => null,
            'leadcount_max' => null,
            'leadcount_exclude' => null,
            'process_type' => 'taping',
        ]);
        $stateB = $this->makeSetupState([
            'setup_state_id' => 2,
            'machine_id' => 200,
            'factory' => 'F1',
            'package_name' => 'LFCSP',
            'body_size' => '6X6',
            'thickness' => null,
            'leadcount_min' => null,
            'leadcount_max' => null,
            'leadcount_exclude' => null,
            'process_type' => 'taping',
        ]);

        $this->injectRef($service, [
            'setup_states' => collect([$stateA, $stateB]),
            'part_rules_by_state' => collect(),
            'dedicated_parts' => collect(),
            'transition_rules_by_machine' => collect([
                100 => collect([
                    $this->makeTransitionRule([
                        'rule_id' => 1,
                        'machine_id' => 100,
                        'from_state_id' => null,
                        'to_state_id' => 1,
                        'operation_type' => 'setup',
                        'est_duration_minutes' => 240,
                    ]),
                ]),
                // machine 200 already sits in state 2 — anchor matches exactly, so
                // transitionCost short-circuits to 'none' before any rule lookup
            ]),
        ]);

        \App\Models\PartName::create(['devicename' => 'TEST-PART', 'recipe' => 50]);

        $lot = $this->makeLot(['Package_Name' => 'LFCSP', 'Body_Size' => '6X6']);

        $choice = $service->rankCandidatesForLot(
            $lot,
            collect(),
            collect([100 => null, 200 => 2]), // machine 200's anchor already = state 2
            collect([100 => 999999, 200 => 999999])
        );

        $this->assertNotNull($choice);
        $this->assertSame(200, $choice['machine_id'], 'machine 200 is a free match, should win over machine 100\'s 240min setup');
        $this->assertSame('none', $choice['operation_type']);
    }
}
