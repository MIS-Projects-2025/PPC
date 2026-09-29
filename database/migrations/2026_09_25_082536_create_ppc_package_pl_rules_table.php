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
        Schema::create('ppc_package_pl_rules', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('package', 45)->index('idx_rules_package');
            $table->string('production_line', 10);
            $table->string('factory', 10)->nullable();
            $table->integer('lead_count')->nullable();
            $table->integer('priority')->default(100);
            $table->boolean('is_active')->default(true);
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();
            $table->string('partname_like', 100)->nullable();

            $table->index(['factory', 'package'], 'idx_rules_factory_package');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ppc_package_pl_rules');
    }
};
