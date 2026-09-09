<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loading_plan_entry_history', function (Blueprint $table) {
            $table->id();

            // Plain indexed column, NOT a foreign key — history must survive
            // if an entry is ever hard-deleted.
            $table->unsignedBigInteger('entry_id');

            $table->timestamp('changed_at')->useCurrent();
            $table->unsignedBigInteger('changed_by')->nullable(); // users.id, nullable for system/cron changes
            $table->enum('change_type', ['created', 'updated', 'deleted'])->default('updated');

            $table->json('changed_columns')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            $table->index(['entry_id', 'changed_at'], 'idx_history_entry');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loading_plan_entry_history');
    }
};
