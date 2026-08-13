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

            INSERT INTO ppc.lot_commits (customer_data_id, Lot_Id, Qty, recipe_used, `commit`, recipe_status)
            VALUES (
                NEW.customer_data_id,
                NEW.Lot_Id,
                NEW.Qty,
                v_recipe,
                CASE WHEN v_recipe IS NOT NULL AND v_recipe > 0 THEN FLOOR(NEW.Qty / v_recipe) * v_recipe ELSE NULL END,
                CASE WHEN v_recipe IS NOT NULL AND v_recipe > 0 THEN 'ok' ELSE 'no_recipe' END
            );
        END
    ");
    }

    public function down(): void
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

            INSERT INTO ppc.lot_commits (Lot_Id, Qty, recipe_used, `commit`, recipe_status)
            VALUES (
                NEW.Lot_Id,
                NEW.Qty,
                v_recipe,
                CASE WHEN v_recipe IS NOT NULL AND v_recipe > 0 THEN FLOOR(NEW.Qty / v_recipe) * v_recipe ELSE NULL END,
                CASE WHEN v_recipe IS NOT NULL AND v_recipe > 0 THEN 'ok' ELSE 'no_recipe' END
            )
            ON DUPLICATE KEY UPDATE
                Qty = NEW.Qty,
                recipe_used = v_recipe,
                `commit` = CASE WHEN v_recipe IS NOT NULL AND v_recipe > 0 THEN FLOOR(NEW.Qty / v_recipe) * v_recipe ELSE NULL END,
                recipe_status = CASE WHEN v_recipe IS NOT NULL AND v_recipe > 0 THEN 'ok' ELSE 'no_recipe' END,
                computed_at = NOW();
        END
    ");
    }
};
