<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lot_commits', function (Blueprint $table) {
            $table->unsignedInteger('recipe_source_id')
                ->nullable()
                ->after('recipe_used')
                ->comment('FK to qdn_db.package_list.id — the specific row recipe_used came from.');
        });

        DB::unprepared('DROP TRIGGER IF EXISTS trg_lot_commit_insert');

        // devicename is now unique on qdn_db.package_list (see prior
        // migration), so this SELECT is deterministic: at most one row
        // can match.
        DB::unprepared("
        CREATE TRIGGER trg_lot_commit_insert
        AFTER INSERT ON ppc.customer_data_wip
        FOR EACH ROW
        BEGIN
            DECLARE v_recipe INT;
            DECLARE v_recipe_source_id INT;

            SELECT id, recipe INTO v_recipe_source_id, v_recipe
            FROM qdn_db.package_list
            WHERE devicename = NEW.Part_Name
            LIMIT 1;

            INSERT INTO ppc.lot_commits (customer_data_id, Lot_Id, Qty, recipe_used, recipe_source_id, `commit`, recipe_status)
            VALUES (
                NEW.customer_data_id,
                NEW.Lot_Id,
                NEW.Qty,
                v_recipe,
                v_recipe_source_id,
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

        Schema::table('lot_commits', function (Blueprint $table) {
            $table->dropColumn('recipe_source_id');
        });
    }
};
