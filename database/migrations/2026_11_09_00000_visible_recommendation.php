<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Phase 2a. A recommendation row now exists BEFORE the staging does (the endpoint creates it,
// the commit links it), so lot_staging_id and actual_slot_ids become nullable.
// Note: ->change() needs Laravel 10+ (or doctrine/dbal on older versions).
return new class extends Migration {
    public function up(): void
    {
        Schema::table('placement_recommendations', function (Blueprint $table) {
            $table->unsignedBigInteger('lot_staging_id')->nullable()->change();
            $table->json('actual_slot_ids')->nullable()->change();

            $table->unsignedBigInteger('rack_page_id')->nullable()->after('lot_staging_id');
            $table->string('lot_code', 50)->nullable()->after('rack_page_id');
            $table->string('reason', 30)->nullable()->after('recommended');           // why there is no recommendation
            $table->string('adherence', 10)->nullable()->after('model_contradicted'); // full | partial | none | NULL (no recommendation)
            $table->timestamp('committed_at')->nullable();
            $table->timestamp('didnt_fit_at')->nullable();

            $table->index(['rack_page_id', 'created_at'], 'idx_placement_rec_page_created');
        });

        // Phase 1 shadow rows were written at commit time.
        DB::statement('UPDATE placement_recommendations SET committed_at = created_at WHERE lot_staging_id IS NOT NULL');

        // Kill switch, one row per rack page. Seeded OFF: enable PL6 explicitly (see PHASE2A_CHANGES.md).
        $pageId = DB::table('rack_pages')->where('key', 'PL6')->value('id');
        if ($pageId) {
            DB::table('placement_settings')->updateOrInsert(
                ['key' => "recommendations_visible:{$pageId}"],
                ['value' => 0],
            );
        }
    }

    public function down(): void
    {
        DB::table('placement_settings')->where('key', 'like', 'recommendations_visible:%')->delete();

        // Rows that never reached a commit cannot exist once lot_staging_id is NOT NULL again.
        DB::table('placement_recommendations')->whereNull('lot_staging_id')->delete();

        Schema::table('placement_recommendations', function (Blueprint $table) {
            $table->dropIndex('idx_placement_rec_page_created');
            $table->dropColumn(['rack_page_id', 'lot_code', 'reason', 'adherence', 'committed_at', 'didnt_fit_at']);
        });

        Schema::table('placement_recommendations', function (Blueprint $table) {
            $table->unsignedBigInteger('lot_staging_id')->nullable(false)->change();
            $table->json('actual_slot_ids')->nullable(false)->change();
        });
    }
};
