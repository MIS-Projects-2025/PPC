<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One "config" = one rule set for a machine. A config can accept
     * multiple packages (see machine_capability_packages) and is
     * narrowed further by leadcount/body-size/process-type. Only
     * consulted for lots whose Part_Name is NOT found in
     * machine_dedicated_parts.
     *
     * machine_id is intentionally NOT a DB-level foreign key: `machines`
     * lives in the qdn_db connection/database, not this one.
     */
    public function up(): void
    {
        Schema::create('machine_capability_configs', function (Blueprint $table) {
            $table->id('capability_id');
            $table->unsignedInteger('machine_id'); // references qdn_db.machines.machine_id — no DB-level FK (cross-database)

            // DDPAK-style output constraint. NULL = not applicable/unrestricted.
            $table->enum('process_type', ['taping', 'tubing', 'both'])->nullable();

            // Human-readable original text, kept for audit/traceability.
            $table->string('remarks', 255)->nullable();

            $table->index('machine_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('machine_capability_configs');
    }
};
