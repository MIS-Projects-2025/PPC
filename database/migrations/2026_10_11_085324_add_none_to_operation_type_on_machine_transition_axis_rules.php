<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    protected $connection = 'qdn_db';

    public function up(): void
    {
        DB::connection('qdn_db')->statement("
            ALTER TABLE machine_transition_axis_rules
            MODIFY operation_type ENUM('setup','conversion','none') NOT NULL
        ");
    }

    public function down(): void
    {
        DB::connection('qdn_db')
            ->table('machine_transition_axis_rules')
            ->where('operation_type', 'none')
            ->delete();

        DB::connection('qdn_db')->statement("
            ALTER TABLE machine_transition_axis_rules
            MODIFY operation_type ENUM('setup','conversion') NOT NULL
        ");
    }
};
