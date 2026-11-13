<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bosch_parts', function (Blueprint $table) {
            $table->json('badges')->nullable()->after('partname');
        });

        DB::table('bosch_parts')->where('is_bosch', true)
            ->update(['badges' => json_encode(['BOSCH'])]);

        DB::table('bosch_parts')
            ->where(fn($q) => $q->where('is_bosch', false)->orWhereNull('is_bosch'))
            ->update(['badges' => json_encode([])]);

        Schema::table('bosch_parts', function (Blueprint $table) {
            $table->dropColumn('is_bosch');
        });
    }

    public function down(): void
    {
        Schema::table('bosch_parts', function (Blueprint $table) {
            $table->boolean('is_bosch')->default(false)->after('partname');
        });

        DB::table('bosch_parts')->whereJsonContains('badges', 'BOSCH')->update(['is_bosch' => true]);

        Schema::table('bosch_parts', function (Blueprint $table) {
            $table->dropColumn('badges');
        });
    }
};
