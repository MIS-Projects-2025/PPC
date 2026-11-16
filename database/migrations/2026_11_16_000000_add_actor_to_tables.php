<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('loading_plan_entry_history', fn(Blueprint $t) => $t->string('changed_by', 64)->nullable()->change());
        Schema::table('lot_quantity_history',       fn(Blueprint $t) => $t->string('changed_by', 64)->nullable()->change());

        Schema::table('lot_splits', function (Blueprint $t) {
            $t->string('created_by', 64)->nullable()->change();
            $t->string('reverted_by', 64)->nullable()->change();
        });
        Schema::table('lot_merges', function (Blueprint $t) {
            $t->string('created_by', 64)->nullable()->change();
            $t->string('reverted_by', 64)->nullable()->change();
        });

        Schema::table('scheduler_runs', fn(Blueprint $t) => $t->string('run_by', 64)->nullable());
    }

    public function down(): void
    {
        Schema::table('scheduler_runs', fn(Blueprint $t) => $t->dropColumn('run_by'));
        // column type changes intentionally not reversed
    }
};
