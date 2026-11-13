<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lot_stagings', function (Blueprint $t) {
            $t->json('box_items')->nullable()->after('box_details'); // [{dimension_id, boxes}]
            $t->string('box_details', 255)->nullable()->change();    // lists are longer than one name
        });

        Schema::table('box_info_overrides', function (Blueprint $t) {
            $t->string('set_key', 255)->default('')->change();
            $t->string('original_box_details', 255)->nullable()->change();
            $t->string('box_details', 255)->nullable()->change();
        });

        // Existing single-size stagings become a one-item list.
        DB::table('lot_stagings')
            ->whereNotNull('dimension_id')->whereNotNull('box_count')->whereNull('box_items')
            ->update(['box_items' => DB::raw("JSON_ARRAY(JSON_OBJECT('dimension_id', dimension_id, 'boxes', box_count))")]);
    }

    public function down(): void
    {
        Schema::table('lot_stagings', fn(Blueprint $t) => $t->dropColumn('box_items'));
    }
};
