<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lots', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->string('lot_id', 50);
            $table->string('partname', 255);
            $table->unsignedInteger('qty');
            $table->enum('status', [
                'staged',
                'released',
            ])->default('staged');
            $table->timestamp('received_at')->useCurrent();
            $table->string('received_by', 10);
            $table->string('modified_by', 10);
            $table->timestamps();

            $table->index('lot_id',      'idx_lots_lot_id');
            $table->index('status',      'idx_lots_status');
            $table->index('received_at', 'idx_lots_received_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lots');
    }
};
