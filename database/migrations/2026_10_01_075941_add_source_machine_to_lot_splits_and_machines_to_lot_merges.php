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
        Schema::table('lot_splits', function (Blueprint $t) {
            $t->string('source_machine')->nullable()->after('target_machine');
        });

        Schema::table('lot_merges', function (Blueprint $t) {
            $t->string('source_machine')->nullable();
            $t->string('target_machine')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('lot_splits', function (Blueprint $t) {
            $t->dropColumn('source_machine');
        });

        Schema::table('lot_merges', function (Blueprint $t) {
            $t->dropColumn([
                'source_machine',
                'target_machine',
            ]);
        });
    }
};
