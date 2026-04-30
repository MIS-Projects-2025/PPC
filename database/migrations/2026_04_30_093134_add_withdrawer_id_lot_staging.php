<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lot_stagings', function (Blueprint $table) {
            $table->string('withdrawer_id')->nullable()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('lot_stagings', function (Blueprint $table) {
            $table->dropColumn('withdrawer_id');
        });
    }
};
