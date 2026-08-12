<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->string('machine_snapshot')->nullable()->after('machine_id');
            $table->integer('capacity_uph_snapshot')->nullable()->after('machine_snapshot');
            $table->timestamp('finalized_at')->nullable()->after('capacity_uph_snapshot');
            $table->index('finalized_at');
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropIndex(['finalized_at']);
            $table->dropColumn(['machine_snapshot', 'capacity_uph_snapshot', 'finalized_at']);
        });
    }
};
