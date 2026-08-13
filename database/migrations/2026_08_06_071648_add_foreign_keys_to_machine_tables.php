<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Change data types from unsignedInteger to integer to match qdn_db.machine_list.id
        Schema::table('machine_dedicated_parts', function (Blueprint $table) {
            $table->integer('machine_id')->change();
        });

        Schema::table('machine_capability_configs', function (Blueprint $table) {
            $table->integer('machine_id')->change();
        });

        // 2. Add cross-schema foreign keys pointing to qdn_db.machine_list(id)
        Schema::table('machine_dedicated_parts', function (Blueprint $table) {
            $table->foreign('machine_id')
                ->references('id')
                ->on('qdn_db.machine_list')
                ->onDelete('cascade');
        });

        Schema::table('machine_capability_configs', function (Blueprint $table) {
            $table->foreign('machine_id')
                ->references('id')
                ->on('qdn_db.machine_list')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('machine_dedicated_parts', function (Blueprint $table) {
            $table->dropForeign(['machine_id']);
            $table->unsignedInteger('machine_id')->change();
        });

        Schema::table('machine_capability_configs', function (Blueprint $table) {
            $table->dropForeign(['machine_id']);
            $table->unsignedInteger('machine_id')->change();
        });
    }
};
