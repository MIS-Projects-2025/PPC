<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * List of target tables in qdn_db.
     *
     * @var array<string>
     */
    protected array $tables = [
        'qdn_db.machine_setup_states',
        'qdn_db.machine_transition_rules',
        'qdn_db.machine_capability_part_rules',
        'qdn_db.machine_transition_rule_exceptions',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tables as $table) {
            DB::statement("
                ALTER TABLE {$table} 
                MODIFY COLUMN `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                MODIFY COLUMN `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->tables as $table) {
            DB::statement("
                ALTER TABLE {$table} 
                MODIFY COLUMN `created_at` TIMESTAMP NULL DEFAULT NULL,
                MODIFY COLUMN `updated_at` TIMESTAMP NULL DEFAULT NULL
            ");
        }
    }
};
