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
        Schema::connection('qdn_db')->table('machine_setup_states', function (Blueprint $table) {
            $table->string('focus_group', 10)->nullable()->after('factory');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('qdn_db')->table('machine_setup_states', function (Blueprint $table) {
            $table->dropColumn('focus_group');
        });
    }
};
