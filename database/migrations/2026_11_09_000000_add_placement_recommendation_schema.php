<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Master list of box sizes (mm). depth_units: 2 = full depth, 1 = mini-pizza (half depth).
        Schema::create('box_dimensions', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('length');
            $table->unsignedSmallInteger('height');
            $table->unsignedTinyInteger('depth_units')->default(2);
            $table->timestamps();

            $table->unique(['length', 'height', 'depth_units']);
        });

        // key/value so new settings never need a migration.
        Schema::create('placement_settings', function (Blueprint $table) {
            $table->string('key', 40)->primary();
            $table->decimal('value', 8, 2);
        });

        // Placeholder starting values from the requirements (5.6). Tune after measuring real boxes.
        DB::table('placement_settings')->insert([
            ['key' => 'column_gap',       'value' => 10],
            ['key' => 'end_margin',       'value' => 10],
            ['key' => 'height_clearance', 'value' => 10],
            ['key' => 'utilization_cap',  'value' => 0.85],
        ]);

        Schema::table('lot_stagings', function (Blueprint $table) {
            // On the cycle, not the lot: box count changes when a lot returns.
            $table->foreignId('dimension_id')->nullable()->constrained('box_dimensions');
            $table->unsignedSmallInteger('box_count')->nullable();
        });

        Schema::table('lot_positions', function (Blueprint $table) {
            $table->unsignedSmallInteger('box_count')->nullable();
            $table->timestamp('presumed_released_at')->nullable();
        });

        Schema::table('rack_slots', function (Blueprint $table) {
            $table->unsignedSmallInteger('length')->nullable();   // mm, NULL = untracked
            $table->unsignedSmallInteger('height')->nullable();   // mm, NULL = untracked
            $table->boolean('tracked')->default(true);            // false for tub slots
        });

        // Shadow mode: what the engine would have said vs. what the operator did.
        Schema::create('placement_recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lot_staging_id')->unique()->constrained('lot_stagings')->cascadeOnDelete();
            $table->json('recommended')->nullable();      // [{slot_id, boxes}] or NULL = no recommendation
            $table->json('actual_slot_ids');
            $table->boolean('model_contradicted')->nullable(); // NULL = could not be evaluated
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_recommendations');

        Schema::table('rack_slots', function (Blueprint $table) {
            $table->dropColumn(['length', 'height', 'tracked']);
        });

        Schema::table('lot_positions', function (Blueprint $table) {
            $table->dropColumn(['box_count', 'presumed_released_at']);
        });

        Schema::table('lot_stagings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('dimension_id');
            $table->dropColumn('box_count');
        });

        Schema::dropIfExists('placement_settings');
        Schema::dropIfExists('box_dimensions');
    }
};
