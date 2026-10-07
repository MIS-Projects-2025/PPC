<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $schema = Schema::connection('qdn_db');

        // Match the exact integer type of machine_setup_states.setup_state_id so the foreign key can be created.
        $type = DB::connection('qdn_db')->selectOne(
            "SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machine_setup_states' AND COLUMN_NAME = 'setup_state_id'"
        )->t;
        $big = str_starts_with($type, 'bigint');
        $unsigned = str_contains($type, 'unsigned');

        $schema->create('machine_transition_groups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('machine_id')->index();
            $table->string('name', 60);
            $table->string('color', 9)->nullable();
            $table->timestamps();
            $table->unique(['machine_id', 'name']);
        });

        $schema->create('machine_transition_group_members', function (Blueprint $table) use ($big, $unsigned) {
            $table->unsignedBigInteger('group_id');
            $col = $big ? $table->bigInteger('setup_state_id') : $table->integer('setup_state_id');
            if ($unsigned) {
                $col->unsigned();
            }
            $table->primary(['group_id', 'setup_state_id']);
            $table->index('setup_state_id');
            $table->foreign('group_id')->references('id')->on('machine_transition_groups')->cascadeOnDelete();
            $table->foreign('setup_state_id')->references('setup_state_id')->on('machine_setup_states')->cascadeOnDelete();
        });

        $schema->create('machine_group_transition_rules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('machine_id')->index();
            $table->unsignedBigInteger('from_group_id');
            $table->unsignedBigInteger('to_group_id');
            $table->string('operation_type', 20); // setup | conversion
            $table->unsignedInteger('est_duration_minutes');
            $table->boolean('symmetric')->default(true);
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->unique(['from_group_id', 'to_group_id']);
            $table->foreign('from_group_id')->references('id')->on('machine_transition_groups')->cascadeOnDelete();
            $table->foreign('to_group_id')->references('id')->on('machine_transition_groups')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        $schema = Schema::connection('qdn_db');
        $schema->dropIfExists('machine_group_transition_rules');
        $schema->dropIfExists('machine_transition_group_members');
        $schema->dropIfExists('machine_transition_groups');
    }
};
