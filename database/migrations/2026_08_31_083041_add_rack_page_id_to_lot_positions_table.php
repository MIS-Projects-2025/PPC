<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lot_positions', function (Blueprint $table) {
            // Denormalized the same way production_line_id already is: snapshot
            // of $slot->rack->rack_page_id at assignment time. Needed because
            // production_line_id alone can't distinguish "physically at PL1"
            // from "on the PL1 page" once ResCon racks exist (a ResCon rack's
            // production_line_id is always its physical PL, regardless of
            // which page's lots it's actually holding).
            $table->foreignId('rack_page_id')
                ->nullable()
                ->after('production_line_id')
                ->constrained('rack_pages')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });

        // Backfill from the rack each position's slot currently belongs to.
        DB::statement('
            UPDATE lot_positions lp
            JOIN rack_slots rs ON rs.id = lp.rack_slot_id
            JOIN racks r ON r.id = rs.rack_id
            SET lp.rack_page_id = r.rack_page_id
            WHERE lp.rack_page_id IS NULL
        ');

        // Fail loudly with an actionable message instead of letting the
        // NOT NULL change below blow up with a bare SQLSTATE error.
        $unmapped = DB::table('lot_positions')->whereNull('rack_page_id')->count();

        if ($unmapped > 0) {
            throw new \RuntimeException(
                "{$unmapped} lot_positions row(s) have no rack_page_id after backfill " .
                    "(orphaned rack_slot_id or rack.rack_page_id is NULL). " .
                    "Run: SELECT lp.id, lp.rack_slot_id FROM lot_positions lp WHERE lp.rack_page_id IS NULL; " .
                    "and resolve before re-running this migration."
            );
        }

        Schema::table('lot_positions', function (Blueprint $table) {
            $table->foreignId('rack_page_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('lot_positions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('rack_page_id');
        });
    }
};
