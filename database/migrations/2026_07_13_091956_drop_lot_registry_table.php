<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // loading_plan_entries.lot_id has a real FK to lot_registry.Lot_Id
        // (loading_plan_entries_lot_id_foreign), so it must be dropped
        // before lot_registry itself can be dropped.
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropForeign('loading_plan_entries_lot_id_foreign');
        });

        // lot_registry was only ever written by
        // LoadingPlanEntryService::createManualLot() (with a synthetic,
        // never-reused Lot_Id) and only ever read back by
        // LoadingPlanController for the same Part_Name/Package_Name/Qty
        // the user had just typed in. Now that those fields live directly
        // on loading_plan_entries, this table has no readers or writers
        // left anywhere in the app.
        Schema::dropIfExists('lot_registry');
    }

    public function down(): void
    {
        Schema::create('lot_registry', function (Blueprint $table) {
            $table->id();
            $table->string('Lot_Id', 64)->unique();
            $table->string('Part_Name', 100)->nullable();
            $table->string('Package_Name', 50)->nullable();
            $table->integer('Qty')->nullable();
            $table->timestamp('first_seen')->useCurrent();
            $table->timestamp('last_seen')->useCurrent()->useCurrentOnUpdate();
        });

        // Re-add the FK. Note: if any loading_plan_entries.lot_id values
        // were inserted after the table was dropped and don't exist in the
        // freshly recreated (empty) lot_registry, this will fail — the
        // down() migration assumes it's run soon after up(), not much
        // later against drifted data.
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->foreign('lot_id', 'loading_plan_entries_lot_id_foreign')
                ->references('Lot_Id')->on('lot_registry');
        });
    }
};
