<?php

namespace Tests\Feature\LoadingPlan;

use App\Models\CustomerDataWip;
use App\Models\LoadingPlanEntry;

class TransferEntryTest extends LoadingPlanFeatureTestCase
{
    public function test_transfers_a_planned_entry_to_a_different_machine(): void
    {
        $source = $this->machine('M1');
        $target = $this->machine('M2');

        $entry = LoadingPlanEntry::factory()->onMachine($source, 1000)->create(['scheduled_date' => '2026-01-05']);

        $response = $this->postJson(route('loading-plan.transfer'), [
            'entry_type'     => 'lot',
            'entry_id'       => $entry->id,
            'target_machine' => 'M2',
        ]);

        $response->assertOk();
        $this->assertEquals($target->id, $entry->fresh()->machine_id);
    }

    public function test_a_null_target_machine_unassigns_instead_of_transferring(): void
    {
        $machine = $this->machine('M1');
        $entry = LoadingPlanEntry::factory()->onMachine($machine, 1000)->create(['scheduled_date' => '2026-01-05']);

        $response = $this->postJson(route('loading-plan.transfer'), [
            'entry_type'     => 'lot',
            'entry_id'       => $entry->id,
            'target_machine' => null,
        ]);

        $response->assertOk();
        $entry->refresh();
        $this->assertNull($entry->machine_id);
        $this->assertNull($entry->sequence_order);
    }

    public function test_transferring_an_unplanned_wip_lot_requires_lot_id_and_date(): void
    {
        $this->machine('M2');

        $response = $this->postJson(route('loading-plan.transfer'), [
            'entry_type'     => 'lot',
            'target_machine' => 'M2',
        ]);

        $response->assertStatus(422);
    }

    public function test_transferring_an_unplanned_wip_lot_creates_and_places_an_entry(): void
    {
        $target = $this->machine('M2');

        CustomerDataWip::factory()->create([
            'Lot_Id'      => 'WIP-LOT-1',
            'import_date' => '2026-01-05',
        ]);

        $response = $this->postJson(route('loading-plan.transfer'), [
            'entry_type'     => 'lot',
            'lot_id'         => 'WIP-LOT-1',
            'scheduled_date' => '2026-01-05',
            'target_machine' => 'M2',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('loading_plan_entries', [
            'lot_id'     => 'WIP-LOT-1',
            'machine_id' => $target->id,
        ]);
    }

    public function test_bulk_transfers_a_mix_of_planned_and_unplanned_lots(): void
    {
        $target = $this->machine('M2');
        $source = $this->machine('M1');

        LoadingPlanEntry::factory()->onMachine($source, 1000)->create([
            'lot_id'         => 'PLANNED-1',
            'scheduled_date' => '2026-01-05',
        ]);

        CustomerDataWip::factory()->create([
            'Lot_Id'      => 'UNPLANNED-1',
            'import_date' => '2026-01-05',
        ]);

        $response = $this->postJson(route('loading-plan.bulk-transfer'), [
            'lot_ids'        => ['PLANNED-1', 'UNPLANNED-1'],
            'target_machine' => 'M2',
            'scheduled_date' => '2026-01-05',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('loading_plan_entries', ['lot_id' => 'PLANNED-1', 'machine_id' => $target->id]);
        $this->assertDatabaseHas('loading_plan_entries', ['lot_id' => 'UNPLANNED-1', 'machine_id' => $target->id]);
    }

    public function test_bulk_transfer_is_a_no_op_when_everything_is_already_on_the_target(): void
    {
        $target = $this->machine('M2');

        $entry = LoadingPlanEntry::factory()->onMachine($target, 1000)->create([
            'lot_id'         => 'ALREADY-THERE',
            'scheduled_date' => '2026-01-05',
        ]);

        $response = $this->postJson(route('loading-plan.bulk-transfer'), [
            'lot_ids'        => ['ALREADY-THERE'],
            'target_machine' => 'M2',
            'scheduled_date' => '2026-01-05',
        ]);

        $response->assertOk()->assertJson([]);
        $this->assertEquals(1, $entry->fresh()->lock_version); // untouched
    }
}
