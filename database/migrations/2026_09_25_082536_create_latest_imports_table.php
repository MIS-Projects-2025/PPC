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
        Schema::create('latest_imports', function (Blueprint $table) {
            $table->enum('import_type', ['f1f2_wip', 'f1f2_out', 'f3_wip', 'f3_out', 'capacity', 'f3', 'pickup', 'f3_pickup'])->primary();
            $table->dateTime('latest_import');
            $table->string('imported_by', 7)->nullable();
            $table->integer('entries')->nullable()->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('latest_imports');
    }
};
