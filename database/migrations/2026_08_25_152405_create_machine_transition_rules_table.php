<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('qdn_db')->create('machine_transition_rules', function (Blueprint $table) {
            $table->id('rule_id');

            $table->integer('machine_id');
            $table->foreign('machine_id')
                ->references('id')->on('machine_list')
                ->cascadeOnDelete();

            // null = "from any state" (wildcard)
            $table->unsignedBigInteger('from_state_id')->nullable();
            $table->foreign('from_state_id')
                ->references('setup_state_id')->on('machine_setup_states')
                ->cascadeOnDelete();

            $table->unsignedBigInteger('to_state_id');
            $table->foreign('to_state_id')
                ->references('setup_state_id')->on('machine_setup_states')
                ->cascadeOnDelete();

            $table->enum('operation_type', ['none', 'conversion', 'setup']);
            $table->integer('est_duration_minutes')->nullable(); // dynamic; setup~240, conversion~600 as baselines
            $table->string('notes', 255)->nullable();

            $table->timestamps();

            $table->index(['machine_id', 'from_state_id', 'to_state_id'], 'idx_mtr_lookup');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->dropIfExists('machine_transition_rules');
    }
};
