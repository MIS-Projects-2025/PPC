<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $indexExists = DB::select("
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = 'qdn_db'
              AND TABLE_NAME = 'package_list'
              AND INDEX_NAME = 'idx_devicename_recipe'
        ");

        if (empty($indexExists)) {
            DB::statement('ALTER TABLE qdn_db.package_list ADD INDEX idx_devicename_recipe (devicename, recipe)');
        }
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE qdn_db.package_list DROP INDEX idx_devicename_recipe');
    }
};
