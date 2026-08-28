<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // CFCR-based / RES-dedicated machines aren't gated by package or
        // body_size at all — only by part_name via machine_dedicated_parts.
        // NULL here now means "any package", same convention already used
        // by body_size/thickness.
        Schema::connection('qdn_db')->table('machine_setup_states', function (Blueprint $table) {
            $table->string('package_name', 50)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->table('machine_setup_states', function (Blueprint $table) {
            $table->string('package_name', 50)->nullable(false)->change();
        });
    }
};
