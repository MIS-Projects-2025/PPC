<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One floor map (canvas size) per rack page.
        Schema::create('rack_floor_maps', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rack_page_id'); // rack_pages.id is bigint unsigned
            $table->unsignedSmallInteger('width')->default(28);  // cells
            $table->unsignedSmallInteger('height')->default(12); // cells
            $table->timestamps();

            $table->unique('rack_page_id', 'uq_rack_floor_maps_page');
            $table->foreign('rack_page_id', 'fk_rack_floor_maps_page')
                ->references('id')->on('rack_pages')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
        });

        // One block per shelf ("A", "B", ... "AZ") of a rack, positioned on that floor map.
        // Shelves are not a table of their own: they are derived from rack_slots labels,
        // so a block is identified by (rack_id, shelf_label).
        Schema::create('rack_floor_blocks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rack_floor_map_id');
            $table->unsignedInteger('rack_id'); // racks.id is int unsigned
            $table->string('shelf_label', 10);
            $table->unsignedSmallInteger('x');
            $table->unsignedSmallInteger('y');
            $table->unsignedTinyInteger('w')->default(2);
            $table->unsignedTinyInteger('h')->default(1);
            $table->timestamps();

            $table->unique(['rack_floor_map_id', 'rack_id', 'shelf_label'], 'uq_rack_floor_blocks_shelf');
            $table->index('rack_id', 'idx_rack_floor_blocks_rack');

            $table->foreign('rack_floor_map_id', 'fk_rack_floor_blocks_map')
                ->references('id')->on('rack_floor_maps')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreign('rack_id', 'fk_rack_floor_blocks_rack')
                ->references('id')->on('racks')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rack_floor_blocks');
        Schema::dropIfExists('rack_floor_maps');
    }
};
