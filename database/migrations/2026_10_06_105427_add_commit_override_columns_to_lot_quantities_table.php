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
        Schema::table('lot_quantities', function (Blueprint $table) {
            $table->unsignedInteger('commit_override')->nullable()->after('commit');
            $table->unsignedInteger('commit_override_qty')->nullable()->after('commit_override');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lot_quantities', function (Blueprint $table) {
            $table->dropColumn(['commit_override', 'commit_override_qty']);
        });
    }
};
