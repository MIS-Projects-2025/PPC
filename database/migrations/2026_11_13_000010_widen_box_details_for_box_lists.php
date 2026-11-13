<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lot_stagings', function (Blueprint $t) {
            $t->text('box_details')->nullable()->change();

            if (! Schema::hasColumn('lot_stagings', 'box_items')) {
                $t->json('box_items')->nullable();
            }
        });

        Schema::table('box_info_overrides', function (Blueprint $t) {
            $t->text('original_box_details')->nullable()->change();
            $t->text('box_details')->nullable()->change();
            // Part of the unique index: (20 + 64 + 500) x 4 bytes = 2336, under InnoDB's 3072 limit.
            $t->string('set_key', 500)->default('')->change();
        });
    }

    public function down(): void {}
};
