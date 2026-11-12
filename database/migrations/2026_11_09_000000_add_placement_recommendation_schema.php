<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('box_dimensions')) {
            Schema::create('box_dimensions', function (Blueprint $table) {
                $table->id();
                $table->unsignedSmallInteger('length');
                $table->unsignedSmallInteger('height');
                $table->unsignedTinyInteger('depth_units')->default(2);
                $table->timestamps();

                $table->unique(['length', 'height', 'depth_units']);
            });
        }

        if (! Schema::hasTable('placement_settings')) {
            Schema::create('placement_settings', function (Blueprint $table) {
                $table->string('key', 40)->primary();
                $table->decimal('value', 8, 2);
            });
        }

        // insertOrIgnore: never overwrites or duplicates values that already exist.
        DB::table('placement_settings')->insertOrIgnore([
            ['key' => 'column_gap',       'value' => 10],
            ['key' => 'end_margin',       'value' => 10],
            ['key' => 'height_clearance', 'value' => 10],
            ['key' => 'utilization_cap',  'value' => 0.85],
        ]);

        Schema::table('lot_stagings', function (Blueprint $table) {
            if (! Schema::hasColumn('lot_stagings', 'dimension_id')) {
                $table->foreignId('dimension_id')->nullable()->constrained('box_dimensions');
            }
            if (! Schema::hasColumn('lot_stagings', 'box_count')) {
                $table->unsignedSmallInteger('box_count')->nullable();
            }
        });

        Schema::table('lot_positions', function (Blueprint $table) {
            if (! Schema::hasColumn('lot_positions', 'box_count')) {
                $table->unsignedSmallInteger('box_count')->nullable();
            }
            if (! Schema::hasColumn('lot_positions', 'presumed_released_at')) {
                $table->timestamp('presumed_released_at')->nullable();
            }
        });

        Schema::table('rack_slots', function (Blueprint $table) {
            if (! Schema::hasColumn('rack_slots', 'length')) {
                $table->unsignedSmallInteger('length')->nullable();
            }
            if (! Schema::hasColumn('rack_slots', 'height')) {
                $table->unsignedSmallInteger('height')->nullable();
            }
            if (! Schema::hasColumn('rack_slots', 'tracked')) {
                $table->boolean('tracked')->default(true);
            }
        });

        if (! Schema::hasTable('placement_recommendations')) {
            Schema::create('placement_recommendations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lot_staging_id')->unique()->constrained('lot_stagings')->cascadeOnDelete();
                $table->json('recommended')->nullable();
                $table->json('actual_slot_ids');
                $table->boolean('model_contradicted')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    // Deliberately conservative: box_dimensions may predate this migration on prod,
    // so down() must not drop it (or the lot_stagings columns it may not own).
    public function down(): void
    {
        Schema::dropIfExists('placement_recommendations');
    }
};
