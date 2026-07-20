<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add customer_data_id column if it doesn't exist
        $columnExists = DB::select("
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = 'ppc'
              AND TABLE_NAME = 'lot_commits'
              AND COLUMN_NAME = 'customer_data_id'
        ");

        if (empty($columnExists)) {
            DB::statement("
                ALTER TABLE ppc.lot_commits
                ADD COLUMN customer_data_id INT NULL AFTER Lot_Id
            ");
        }

        // Drop the old unique key on Lot_Id alone
        DB::statement("ALTER TABLE ppc.lot_commits DROP INDEX uq_lot_commits_lot_id");

        // Add new unique key on customer_data_id — one commit row per source wip row
        $newKeyExists = DB::select("
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = 'ppc'
              AND TABLE_NAME = 'lot_commits'
              AND INDEX_NAME = 'uq_lot_commits_customer_data_id'
        ");

        if (empty($newKeyExists)) {
            DB::statement("
                ALTER TABLE ppc.lot_commits
                ADD UNIQUE KEY uq_lot_commits_customer_data_id (customer_data_id)
            ");
        }

        // Keep a plain (non-unique) index on Lot_Id since you'll still query/filter by it often
        $lotIdIndexExists = DB::select("
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = 'ppc'
              AND TABLE_NAME = 'lot_commits'
              AND INDEX_NAME = 'idx_lot_commits_lot_id'
        ");

        if (empty($lotIdIndexExists)) {
            DB::statement("
                ALTER TABLE ppc.lot_commits
                ADD INDEX idx_lot_commits_lot_id (Lot_Id)
            ");
        }
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE ppc.lot_commits DROP INDEX idx_lot_commits_lot_id");
        DB::statement("ALTER TABLE ppc.lot_commits DROP INDEX uq_lot_commits_customer_data_id");
        DB::statement("ALTER TABLE ppc.lot_commits ADD UNIQUE KEY uq_lot_commits_lot_id (Lot_Id)");
        DB::statement("ALTER TABLE ppc.lot_commits DROP COLUMN customer_data_id");
    }
};
