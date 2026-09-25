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
        Schema::table('machine_dedicated_parts', function (Blueprint $table) {
            if (Schema::connection('qdn_db')->hasTable('machine_list')) {
                $table->foreign(['machine_id'])->references(['id'])->on('machine_list')->onUpdate('no action')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('machine_dedicated_parts', function (Blueprint $table) {
            if (Schema::connection('qdn_db')->hasTable('machine_list')) {
                $table->dropForeign('machine_dedicated_parts_machine_id_foreign');
            }
        });
    }
};
