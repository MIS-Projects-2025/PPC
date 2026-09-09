<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // NULL = not using include-list mode; falls back to the existing
        // leadcount_min/leadcount_max/leadcount_exclude range-based check.
        // When set, this is authoritative and short-circuits that check
        // entirely — for sparse allow-lists (e.g. only leadcount 3 and 48
        // valid) where min/max+exclude would require excluding almost
        // every value in between just to keep the two that are allowed.
        Schema::connection('qdn_db')->table('machine_setup_states', function (Blueprint $table) {
            $table->string('leadcount_include', 255)->nullable()->after('leadcount_exclude');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->table('machine_setup_states', function (Blueprint $table) {
            $table->dropColumn('leadcount_include');
        });
    }
};
