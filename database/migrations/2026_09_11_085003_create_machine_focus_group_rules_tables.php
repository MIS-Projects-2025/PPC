<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'qdn_db';

    public function up(): void
    {
        DB::connection($this->connection)->statement("
            CREATE TABLE `machine_focus_group_rules` (
                `id` INT NOT NULL AUTO_INCREMENT,
                `machine_id` INT NOT NULL,
                `focus_group` VARCHAR(10) NOT NULL,
                `rule_type` ENUM('exclude', 'include_only') NOT NULL,
                `notes` VARCHAR(255) NULL,
                PRIMARY KEY (`id`),
                CONSTRAINT `machine_focus_group_rules_machine_id_foreign`
                    FOREIGN KEY (`machine_id`)
                    REFERENCES `machine_list` (`id`)
                    ON DELETE CASCADE
            )
            ENGINE=InnoDB
            DEFAULT CHARSET=utf8mb4
            COLLATE=utf8mb4_0900_ai_ci
        ");
    }

    public function down(): void
    {
        Schema::connection($this->connection)
            ->dropIfExists('machine_focus_group_rules');
    }
};
