<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE lots
            ADD COLUMN staged_key VARCHAR(310) GENERATED ALWAYS AS (
                IF(status = 'staged', CONCAT(lot_id, '||', partname), NULL)
            ) VIRTUAL,
            ADD UNIQUE KEY uq_one_staged_per_lot (staged_key)
        ");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE lots DROP KEY uq_one_staged_per_lot");
        DB::statement("ALTER TABLE lots DROP COLUMN staged_key");
    }
};
