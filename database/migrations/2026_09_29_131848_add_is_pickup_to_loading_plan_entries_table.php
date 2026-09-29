<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->boolean('is_pickup')
                ->default(false)
                ->after('entry_type');

            $table->index(
                ['is_pickup', 'scheduled_date'],
                'idx_lpe_is_pickup'
            );
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropIndex('idx_lpe_is_pickup');
            $table->dropColumn('is_pickup');
        });
    }
};
