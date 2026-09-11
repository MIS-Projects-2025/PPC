<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pure negative filter -- one row per (machine, part) pair to
        // exclude. Makes NO claim about where the part CAN run; that's
        // decided entirely by ordinary structural/inclusion matching,
        // independent of this table. Extending "also exclude from
        // machine X" later is just another INSERT, no schema change.
        Schema::connection('qdn_db')->create('machine_part_exclusions', function (Blueprint $table) {
            $table->id();

            $table->integer('machine_id');
            $table->foreign('machine_id')
                ->references('id')->on('machine_list')
                ->cascadeOnDelete();

            $table->string('part_name', 100);
            $table->string('notes', 255)->nullable();

            $table->timestamps();

            $table->unique(['machine_id', 'part_name'], 'uniq_machine_part_exclusion');
            $table->index('part_name');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->dropIfExists('machine_part_exclusions');
    }
};
