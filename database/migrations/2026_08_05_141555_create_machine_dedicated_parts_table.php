<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Highest-priority override, checked BEFORE the capability config
     * tables. If a lot's Part_Name has a row here, the listed machine(s)
     * are the ONLY candidate set for that lot — full stop. If a
     * part_name has no row here at all, fall through to the normal
     * config-based matcher.
     *
     * A part can pin to more than one machine ("either this or that"),
     * so this is a plain many-to-many keyed on (machine_id, part_name),
     * not a part_name-as-primary-key table.
     *
     * machine_id is intentionally NOT a DB-level foreign key: `machines`
     * lives in the qdn_db connection/database, not this one. Referential
     * integrity for machine_id is enforced at the application layer.
     */
    public function up(): void
    {
        Schema::create('machine_dedicated_parts', function (Blueprint $table) {
            $table->unsignedInteger('machine_id'); // references qdn_db.machines.machine_id — no DB-level FK (cross-database)
            $table->string('part_name', 100); // matches lots.Part_Name

            $table->primary(['machine_id', 'part_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('machine_dedicated_parts');
    }
};
