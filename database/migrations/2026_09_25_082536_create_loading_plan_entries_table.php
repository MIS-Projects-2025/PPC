<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('loading_plan_entries', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->enum('entry_type', ['lot', 'block'])->default('lot');
            $table->string('lot_id', 64)->nullable();
            $table->string('part_name')->nullable();
            $table->string('package_name', 50)->nullable();
            $table->date('scheduled_date');
            $table->unsignedInteger('machine_id')->nullable();
            $table->string('machine_snapshot')->nullable();
            $table->integer('doable_snapshot')->nullable();
            $table->timestamp('finalized_at')->nullable()->index();
            $table->decimal('sequence_order', 14, 4)->nullable();
            $table->string('status', 32)->nullable();
            $table->string('tag', 16)->nullable();
            $table->boolean('is_manual_expedite')->default(false);
            $table->text('remarks')->nullable();
            $table->string('block_label', 128)->nullable();
            $table->unsignedBigInteger('resulting_setup_state_id')->nullable()->index('loading_plan_entries_resulting_setup_state_id_foreign');
            $table->enum('operation_type', ['setup', 'conversion'])->nullable();
            $table->unsignedBigInteger('matched_rule_id')->nullable()->index('loading_plan_entries_matched_rule_id_foreign');
            $table->integer('accu_time')->nullable();
            $table->dateTime('time_start')->nullable();
            $table->dateTime('time_end')->nullable();
            $table->timestamps();
            $table->unsignedBigInteger('lock_version')->default(1);

            $table->index(['scheduled_date', 'entry_type'], 'idx_date_entry_type');
            $table->index(['machine_id', 'sequence_order'], 'idx_loading_plan_machine_seq');
            $table->index(['machine_id', 'status', 'time_start'], 'idx_lpe_machine_status_start');
            $table->index(['machine_id', 'time_start', 'time_end'], 'idx_machine_time_range');
            $table->unique(['lot_id', 'scheduled_date'], 'uniq_lot_per_day');
            $table->unique(['machine_id', 'scheduled_date', 'sequence_order'], 'uniq_machine_sequence_per_day');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loading_plan_entries');
    }
};
