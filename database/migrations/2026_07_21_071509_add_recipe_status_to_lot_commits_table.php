<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add recipe_status flag if it doesn't already exist
        $columnExists = DB::select("
            SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = 'ppc'
              AND TABLE_NAME = 'lot_commits'
              AND COLUMN_NAME = 'recipe_status'
        ");

        if (empty($columnExists)) {
            DB::statement("
                ALTER TABLE ppc.lot_commits
                ADD COLUMN recipe_status ENUM('ok', 'no_recipe') NOT NULL DEFAULT 'ok' AFTER recipe_used
            ");
        }

        // Allow `commit` to be NULL so 'no recipe mapped' can be distinguished from a computed 0
        DB::statement("
            ALTER TABLE ppc.lot_commits
            MODIFY COLUMN `commit` INT NULL
        ");
    }

    public function down(): void
    {
        // Backfill any NULLs to 0 before reapplying NOT NULL, or the down() migration will fail
        DB::statement("UPDATE ppc.lot_commits SET `commit` = 0 WHERE `commit` IS NULL");

        DB::statement("
            ALTER TABLE ppc.lot_commits
            MODIFY COLUMN `commit` INT NOT NULL
        ");

        DB::statement("
            ALTER TABLE ppc.lot_commits
            DROP COLUMN recipe_status
        ");
    }
};
