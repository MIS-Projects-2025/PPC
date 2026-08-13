<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Guard: ADD UNIQUE will fail with a generic MySQL duplicate-key
        // error if any devicename appears more than once. Fail loudly here
        // instead, so whoever runs this knows exactly which rows to fix.
        $duplicates = DB::table('qdn_db.package_list')
            ->select('devicename', DB::raw('COUNT(*) as cnt'))
            ->whereNotNull('devicename')
            ->groupBy('devicename')
            ->having('cnt', '>', 1)
            ->pluck('devicename');

        if ($duplicates->isNotEmpty()) {
            throw new \RuntimeException(
                'Cannot add unique index: duplicate devicename values found in '
                    . 'qdn_db.package_list: ' . $duplicates->implode(', ')
                    . '. Resolve these rows before re-running this migration.'
            );
        }

        DB::statement(
            'ALTER TABLE qdn_db.package_list ADD UNIQUE KEY `uq_package_list_devicename` (`devicename`)'
        );
    }

    public function down(): void
    {
        DB::statement(
            'ALTER TABLE qdn_db.package_list DROP INDEX `uq_package_list_devicename`'
        );
    }
};
