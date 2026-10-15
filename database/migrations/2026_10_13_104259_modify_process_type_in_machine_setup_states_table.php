<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'qdn_db';

    public function up(): void
    {
        Schema::connection('qdn_db')->table('machine_setup_states', function (Blueprint $table) {
            $table->enum('process_type', [
                'taping',
                'tubing',
                'both',
                'tray',
                'gel',
                'header',
                'bag',
            ])->nullable(false)->change();
        });
    }

    public function down(): void
    {
        // Restore the previous process_type definition here.
    }
};
