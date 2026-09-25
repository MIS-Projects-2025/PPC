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
        Schema::create('ppc_partnamedb', function (Blueprint $table) {
            $table->integer('ppc_partnamedb_id', true);
            $table->string('Focus_grp', 45)->nullable();
            $table->string('Factory', 10)->nullable();
            $table->string('PL', 45)->nullable();
            $table->string('Partname', 45)->nullable()->index('idx_partnamedb_partname');
            $table->string('Packagename', 45)->nullable();
            $table->string('Packagecategory', 45)->nullable();
            $table->string('Leadcount', 45)->nullable();
            $table->string('Bodysize', 45)->nullable();
            $table->string('Package', 45)->nullable();
            $table->string('added_by', 45)->nullable();
            $table->dateTime('date_created')->nullable()->useCurrent();

            $table->index(['Factory', 'PL', 'Partname'], 'idx_factory_pl_partname');
            $table->index(['Partname', 'Factory', 'PL'], 'idx_partnamedb_part_factory_pl');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ppc_partnamedb');
    }
};
