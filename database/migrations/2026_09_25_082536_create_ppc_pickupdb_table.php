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
        Schema::create('ppc_pickupdb', function (Blueprint $table) {
            $table->integer('id_pickup', true);
            $table->string('PARTNAME', 45)->nullable();
            $table->string('LOTID', 45)->nullable();
            $table->integer('QTY')->nullable();
            $table->string('PACKAGE', 45)->nullable();
            $table->integer('LC')->nullable();
            $table->string('ADDED_BY', 45)->nullable();
            $table->dateTime('DATE_CREATED')->nullable()->useCurrent();
            $table->string('factory', 20)->nullable();

            $table->index(['PARTNAME', 'DATE_CREATED'], 'idx_partname_date');
            $table->index(['DATE_CREATED', 'PARTNAME'], 'idx_pickupdb_date_partname');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ppc_pickupdb');
    }
};
