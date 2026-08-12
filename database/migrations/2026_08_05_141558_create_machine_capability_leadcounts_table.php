<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Leadcount restriction for a config.
     *
     * No rows for a capability_id = unrestricted (any leadcount).
     * mode='include': only the listed leadcounts match
     *   (e.g. "can cater 2, 4, 6").
     * mode='exclude': everything matches except the listed leadcounts
     *   (e.g. "cannot cater 3L SOT-23").
     *
     * A single capability_id should not mix both modes — that's an
     * app-layer validation rule ("include 2,4 except 3" is ambiguous),
     * not something enforced by this schema.
     */
    public function up(): void
    {
        Schema::create('machine_capability_leadcounts', function (Blueprint $table) {
            $table->unsignedBigInteger('capability_id');
            $table->integer('leadcount');
            $table->enum('mode', ['include', 'exclude'])->default('include');

            $table->primary(['capability_id', 'leadcount']);
            $table->foreign('capability_id')
                ->references('capability_id')->on('machine_capability_configs')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('machine_capability_leadcounts');
    }
};
