<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Insert one staging per lot, cycle = 1
        DB::statement("
            INSERT INTO lot_stagings (lot_id, cycle, staged_by, staged_at, released_by, released_at)
            SELECT
                lp.lot_id,
                1,
                lp_first.assigned_by,
                lp_first.assigned_at,
                l.released_by,
                l.released_at
            FROM (
                SELECT DISTINCT lot_id FROM lot_positions
            ) lp
            JOIN lots l ON l.id = lp.lot_id
            JOIN lot_positions lp_first ON lp_first.id = (
                SELECT id FROM lot_positions
                WHERE lot_id = lp.lot_id
                ORDER BY assigned_at ASC
                LIMIT 1
            )
        ");

        // Step 2: Link lot_positions back to their staging
        DB::statement("
            UPDATE lot_positions lp
            JOIN lot_stagings ls ON ls.lot_id = lp.lot_id AND ls.cycle = 1
            SET lp.lot_staging_id = ls.id
        ");
    }

    public function down(): void
    {
        DB::statement("UPDATE lot_positions SET lot_staging_id = NULL");
        DB::statement("DELETE FROM lot_stagings WHERE cycle = 1");
    }
};
