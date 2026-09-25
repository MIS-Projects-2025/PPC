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
        Schema::create('ppc_productionline_packagereference', function (Blueprint $table) {
            $table->string('package', 45)->primary();
            $table->string('production_line', 45)->nullable();

            $table->index(['production_line', 'package'], 'idx_plref_production_package');
            $table->index(['package', 'production_line'], 'idx_wip_package_production_line');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ppc_productionline_packagereference');
    }
};
