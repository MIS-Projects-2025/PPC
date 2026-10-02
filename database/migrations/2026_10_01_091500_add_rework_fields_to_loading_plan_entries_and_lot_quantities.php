<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $t) {
            $t->unsignedSmallInteger('rework_seq')
                ->default(0)
                ->after('is_pickup');

            $t->unsignedBigInteger('rework_of_entry_id')
                ->nullable()
                ->after('rework_seq');

            $t->foreign('rework_of_entry_id')
                ->references('id')
                ->on('loading_plan_entries')
                ->nullOnDelete();
        });

        Schema::table('lot_quantities', function (Blueprint $t) {
            $t->unsignedSmallInteger('rework_seq')
                ->default(0)
                ->after('scheduled_date');
        });

        Schema::table('loading_plan_entries', function (Blueprint $t) {
            $t->dropUnique('uniq_lot_per_day');

            $t->unique(
                ['lot_id', 'scheduled_date', 'rework_seq'],
                'uniq_lot_date_seq'
            );
        });

        Schema::table('lot_quantities', function (Blueprint $t) {
            $t->dropUnique('lot_quantities_lot_id_scheduled_date_unique');

            $t->unique(
                ['lot_id', 'scheduled_date', 'rework_seq'],
                'uniq_lot_date_seq'
            );
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $t) {
            $t->dropForeign(['rework_of_entry_id']);
            $t->dropUnique('uniq_lot_date_seq');

            $t->unique(
                ['lot_id', 'scheduled_date'],
                'uniq_lot_per_day'
            );

            $t->dropColumn([
                'rework_seq',
                'rework_of_entry_id',
            ]);
        });

        Schema::table('lot_quantities', function (Blueprint $t) {
            $t->dropUnique('uniq_lot_date_seq');

            $t->unique(
                ['lot_id', 'scheduled_date']
            );

            $t->dropColumn('rework_seq');
        });
    }
};
