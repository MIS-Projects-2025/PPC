<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    protected $connection = 'qdn_db';

    public function up(): void
    {
        DB::connection('qdn_db')->statement(
            'ALTER TABLE machine_setup_states MODIFY thickness DECIMAL(5,3) DEFAULT NULL'
        );
    }

    public function down(): void
    {
        // Put the previous column definition here to make this reversible, e.g.:
        // DB::connection('qdn_db')->statement(
        //     'ALTER TABLE machine_setup_states MODIFY thickness DECIMAL(x,y) NOT NULL'
        // );
    }
};
