<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $t) {
            $t->unsignedBigInteger('carried_from_entry_id')->nullable();
            $t->date('origin_date')->nullable();
            $t->string('root_lot_id', 100)->nullable();
            $t->index(['scheduled_date', 'root_lot_id'], 'lpe_date_root_idx');
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $t) {
            $t->dropIndex('lpe_date_root_idx');
            $t->dropColumn(['carried_from_entry_id', 'origin_date', 'root_lot_id']);
        });
    }
};
