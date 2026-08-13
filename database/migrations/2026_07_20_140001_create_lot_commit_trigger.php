<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS trg_lot_commit_insert');

        DB::unprepared("
        CREATE TRIGGER trg_lot_commit_insert
        AFTER INSERT ON ppc.customer_data_wip
        FOR EACH ROW
        BEGIN
            DECLARE v_recipe INT;
            SELECT recipe INTO v_recipe
            FROM qdn_db.package_list
            WHERE devicename = NEW.Part_Name
            LIMIT 1;

            IF v_recipe IS NOT NULL AND v_recipe > 0 THEN
                INSERT INTO ppc.lot_commits (Lot_Id, Qty, recipe_used, `commit`)
                VALUES (NEW.Lot_Id, NEW.Qty, v_recipe, FLOOR(NEW.Qty / v_recipe) * v_recipe)
                ON DUPLICATE KEY UPDATE
                    Qty = NEW.Qty,
                    recipe_used = v_recipe,
                    `commit` = FLOOR(NEW.Qty / v_recipe) * v_recipe,
                    computed_at = NOW();
            END IF;
        END
    ");

        DB::statement("
        ALTER TABLE ppc.lot_commits
        COMMENT = 'Auto-populated by trg_lot_commit_insert on ppc.customer_data_wip insert. See database/migrations/<this_file_name>.php'
    ");
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS trg_lot_commit_insert');
        // table comment doesn't need reverting — dropping the trigger is what matters for down()
    }
};
