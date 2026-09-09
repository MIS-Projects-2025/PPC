<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // drop the FK + column first — machine_setup_groups can't be
        // dropped while something still references it
        Schema::connection('qdn_db')->table('machine_setup_states', function (Blueprint $table) {
            $table->dropForeign(['group_id']);
            $table->dropColumn('group_id');
        });

        Schema::connection('qdn_db')->dropIfExists('machine_setup_groups');
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->create('machine_setup_groups', function (Blueprint $table) {
            $table->id('group_id');
            $table->integer('machine_id');
            $table->foreign('machine_id')
                ->references('id')->on('machine_list')
                ->cascadeOnDelete();
            $table->enum('group_type', ['convertible', 'standalone']);
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->index('machine_id');
        });

        Schema::connection('qdn_db')->table('machine_setup_states', function (Blueprint $table) {
            $table->unsignedBigInteger('group_id')->nullable();
            $table->foreign('group_id')
                ->references('group_id')->on('machine_setup_groups')
                ->nullOnDelete();
        });
    }
};
