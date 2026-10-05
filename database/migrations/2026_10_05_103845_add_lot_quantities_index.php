<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $exists = collect(\DB::select("SHOW INDEX FROM lot_quantities WHERE Key_name = 'idx_lq_date_lot_rework'"))->isNotEmpty();

        if (! $exists) {
            Schema::table('lot_quantities', function (Blueprint $table) {
                $table->index(['scheduled_date', 'lot_id', 'rework_seq'], 'idx_lq_date_lot_rework');
            });
        }
    }

    public function down(): void
    {
        Schema::table('lot_quantities', function (Blueprint $table) {
            $table->dropIndex('idx_lq_date_lot_rework');
        });
    }
};
