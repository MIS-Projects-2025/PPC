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
        Schema::connection('qdn_db')->create('machine_transition_axis_rules', function (Blueprint $table) {
            $table->id();

            // Matches 'machine_id INT NOT NULL' and references 'machine_list(id)'
            // Adjust to foreignId() if machine_list.id is a BIGINT UNSIGNED
            $table->integer('machine_id');

            $table->string('axis', 30);
            $table->enum('operation_type', ['setup', 'conversion']);
            $table->integer('est_duration_minutes');
            $table->enum('combination_rule', ['max', 'sum'])->default('max');

            // Foreign key constraint
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
        Schema::connection('qdn_db')->dropIfExists('machine_transition_axis_rules');
    }
};
