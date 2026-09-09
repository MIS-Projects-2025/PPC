<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('qdn_db')->create('machine_setup_groups', function (Blueprint $table) {
            $table->id('group_id');

            // signed int to match machine_list.id exactly (FK type must match)
            $table->integer('machine_id');
            $table->foreign('machine_id')
                ->references('id')->on('machine_list')
                ->cascadeOnDelete();

            $table->enum('group_type', ['convertible', 'standalone']);
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index('machine_id');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->dropIfExists('machine_setup_groups');
    }
};
