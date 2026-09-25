<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('machine_capability_configs', function (Blueprint $table) {
            if (Schema::connection('qdn_db')->hasTable('machine_list')) {
                $table->foreign('machine_id')
                    ->references('id')->on('qdn_db.machine_list')
                    ->onDelete('cascade')->onUpdate('no action');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('machine_capability_configs', function (Blueprint $table) {
            if (Schema::connection('qdn_db')->hasTable('machine_list')) {
                $table->dropForeign('machine_capability_configs_machine_id_foreign');
            }
        });
    }
};
