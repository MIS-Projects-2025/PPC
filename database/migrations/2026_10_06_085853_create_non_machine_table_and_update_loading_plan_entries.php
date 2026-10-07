<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('non_machines', function (Blueprint $table) {
            $table->id();
            $table->string('name', 64);
            $table->string('location', 10);
            $table->date('scheduled_date');
            $table->timestamps();

            $table->index(
                ['location', 'scheduled_date'],
                'non_machines_location_date_idx'
            );
        });

        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->unsignedBigInteger('non_machine_id')
                ->nullable()
                ->after('machine_id');

            $table->foreign('non_machine_id', 'lpe_non_machine_fk')
                ->references('id')
                ->on('non_machines');

            $table->unique(
                ['non_machine_id', 'scheduled_date', 'sequence_order'],
                'lpe_nm_date_seq'
            );
        });

        DB::statement('
            ALTER TABLE loading_plan_entries
            ADD CONSTRAINT lpe_machine_xor_non_machine
            CHECK (machine_id IS NULL OR non_machine_id IS NULL)
        ');
    }

    public function down(): void
    {
        DB::statement('
            ALTER TABLE loading_plan_entries
            DROP CHECK lpe_machine_xor_non_machine
        ');

        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropUnique('lpe_nm_date_seq');
            $table->dropForeign('lpe_non_machine_fk');
            $table->dropColumn('non_machine_id');
        });

        Schema::dropIfExists('non_machines');
    }
};
