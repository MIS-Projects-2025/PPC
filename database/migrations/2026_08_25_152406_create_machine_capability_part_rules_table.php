<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('qdn_db')->create('machine_capability_part_rules', function (Blueprint $table) {
            $table->id('rule_id');
            $table->unsignedBigInteger('setup_state_id');
            $table->foreign('setup_state_id')
                ->references('setup_state_id')->on('machine_setup_states')
                ->cascadeOnDelete();

            $table->enum('match_type', ['exact', 'contains', 'dedicated_list']);
            $table->string('match_value', 100)->nullable(); // null when match_type='dedicated_list'

            $table->timestamps();

            $table->index('setup_state_id');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->dropIfExists('machine_capability_part_rules');
    }
};
