<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            // User-supplied fields for manually created lots (no backing
            // customer_data_wip row). Previously looked up from
            // lot_registry via lot_id; now stored directly on the entry
            // since the user always types these themselves and a given
            // Lot_Id can legitimately map to different Part_Names over
            // time in customer_data_wip.
            $table->string('part_name', 100)->nullable()->after('lot_id');
            $table->string('package_name', 50)->nullable()->after('part_name');
            $table->integer('qty')->nullable()->after('package_name');
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropColumn(['part_name', 'package_name', 'qty']);
        });
    }
};
