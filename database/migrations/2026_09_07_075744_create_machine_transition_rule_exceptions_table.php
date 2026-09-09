<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('qdn_db')->create('machine_transition_rule_exceptions', function (Blueprint $table) {
            $table->id();

            $table->integer('machine_id'); // signed, matches machine_list.id exactly
            $table->foreign('machine_id')
                ->references('id')->on('machine_list')
                ->cascadeOnDelete();

            $table->string('part_name', 100);

            // null = "from any state" (wildcard), same convention as machine_transition_rules
            $table->unsignedBigInteger('from_state_id')->nullable();
            $table->foreign('from_state_id')
                ->references('setup_state_id')->on('machine_setup_states')
                ->cascadeOnDelete();

            $table->unsignedBigInteger('to_state_id');
            $table->foreign('to_state_id')
                ->references('setup_state_id')->on('machine_setup_states')
                ->cascadeOnDelete();

            $table->enum('operation_type', ['none', 'conversion', 'setup']);
            $table->integer('est_duration_minutes')->nullable();
            $table->string('notes', 255)->nullable();

            $table->timestamps();

            $table->index(['machine_id', 'part_name', 'from_state_id', 'to_state_id'], 'idx_mtre_lookup');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->dropIfExists('machine_transition_rule_exceptions');
    }
};
