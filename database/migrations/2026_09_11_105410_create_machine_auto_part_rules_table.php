<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The database connection that should be used by the migration.
     *
     * @var string
     */
    protected $connection = 'qdn_db';

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::connection('qdn_db')->create('machine_auto_part_rules', function (Blueprint $table) {
            $table->id();
            $table->integer('machine_id');
            $table->string('package_name', 50)->nullable();
            $table->enum('rule_type', ['exclude', 'include_only']);
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            // Foreign Key Constraint
            $table->foreign('machine_id')
                ->references('id')
                ->on('machine_list')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('qdn_db')->dropIfExists('machine_auto_part_rules');
    }
};
