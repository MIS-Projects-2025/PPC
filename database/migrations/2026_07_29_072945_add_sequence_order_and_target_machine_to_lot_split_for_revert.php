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
        Schema::table('lot_splits', function (Blueprint $table) {
            Schema::table('lot_splits', function (Blueprint $table) {
                $table->string('target_machine', 64)->nullable()->after('split_percentage');
                $table->decimal('sequence_order_at_split', 14, 4)->nullable()->after('target_machine');
            });
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lot_splits', function (Blueprint $table) {
            $table->dropColumn(['target_machine', 'sequence_order_at_split']);
        });
    }
};
