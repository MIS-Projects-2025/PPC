<?php

use App\Models\BoxDimension;
use App\Models\RackSlot;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table((new BoxDimension)->getTable(), function (Blueprint $t) {
            $t->decimal('length', 8, 1)->change();
            $t->decimal('height', 8, 1)->change();
        });

        Schema::table((new RackSlot)->getTable(), function (Blueprint $t) {
            $t->decimal('length', 8, 1)->nullable()->change();
            $t->decimal('height', 8, 1)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Restore the original integer types here. Decimals are truncated on the way back.
    }
};
