<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('lot_stagings', function (Blueprint $table) {
            $table->unsignedBigInteger('box_group_id')->nullable()->index();
        });

        // Every existing staging is its own group. Legacy shared boxes stay overcounted until released.
        DB::statement('UPDATE lot_stagings SET box_group_id = id');
    }

    public function down(): void
    {
        Schema::table('lot_stagings', function (Blueprint $table) {
            $table->dropIndex(['box_group_id']);
            $table->dropColumn('box_group_id');
        });
    }
};
