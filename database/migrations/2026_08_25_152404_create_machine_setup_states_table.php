<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('qdn_db')->create('machine_setup_states', function (Blueprint $table) {
            $table->id('setup_state_id');

            $table->integer('machine_id');
            $table->foreign('machine_id')
                ->references('id')->on('machine_list')
                ->cascadeOnDelete();

            $table->unsignedBigInteger('group_id')->nullable();
            $table->foreign('group_id')
                ->references('group_id')->on('machine_setup_groups')
                ->nullOnDelete();

            // the FACTORY here is what the machine is currently TOOLED for,
            // independent of machine_list.factory (its physical home).
            // A machine can be configured to run a different factory's
            // parts than the one it lives in.
            $table->enum('factory', ['F1', 'F2', 'F3']);
            $table->string('package_name', 50);       // matches lots.Package_Name
            $table->string('body_size', 20)->nullable();   // e.g. '4X4', '7X11'; null = any
            $table->decimal('thickness', 5, 2)->nullable(); // e.g. 0.75; null = any

            $table->integer('leadcount_min')->nullable();
            $table->integer('leadcount_max')->nullable();
            $table->string('leadcount_exclude', 50)->nullable(); // csv, e.g. '3' for "except 3L"

            $table->enum('process_type', ['taping', 'tubing', 'both']);
            $table->integer('capacity_daily')->nullable(); // TSPI daily capacity
            $table->string('remarks', 255)->nullable();

            $table->timestamps();

            $table->index(['machine_id', 'factory', 'package_name'], 'idx_mss_machine_factory_pkg');
            $table->index(['package_name', 'body_size'], 'idx_mss_pkg_body');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->dropIfExists('machine_setup_states');
    }
};
