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
        Schema::table('lot_stagings', function (Blueprint $table) {
            $table->string('partname', 255)->nullable()->after('lot_id');
            $table->unsignedInteger('qty')->nullable()->after('partname');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lot_stagings', function (Blueprint $table) {
            $table->dropColumn(['partname', 'qty']);
        });
    }
};
