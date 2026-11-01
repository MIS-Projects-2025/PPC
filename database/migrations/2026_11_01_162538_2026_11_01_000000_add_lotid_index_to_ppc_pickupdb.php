<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $indexExists = DB::selectOne("
            SELECT COUNT(*) AS total
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'ppc_pickupdb'
              AND index_name = 'idx_pickupdb_lotid'
        ")->total;

        if (!$indexExists) {
            DB::statement("
                ALTER TABLE ppc_pickupdb
                ADD INDEX idx_pickupdb_lotid (LOTID),
                ALGORITHM=INPLACE,
                LOCK=NONE
            ");
        }
    }

    public function down(): void
    {
        $indexExists = DB::selectOne("
            SELECT COUNT(*) AS total
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'ppc_pickupdb'
              AND index_name = 'idx_pickupdb_lotid'
        ")->total;

        if ($indexExists) {
            DB::statement("
                ALTER TABLE ppc_pickupdb
                DROP INDEX idx_pickupdb_lotid,
                ALGORITHM=INPLACE,
                LOCK=NONE
            ");
        }
    }
};
