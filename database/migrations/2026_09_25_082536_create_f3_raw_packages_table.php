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
        Schema::create('f3_raw_packages', function (Blueprint $table) {
            $table->integer('id', true);
            $table->string('raw_package', 100)->unique('raw_package_unique');
            $table->integer('lead_count')->nullable();
            $table->integer('package_id')->index('fk_f3_raw_packages_package');
            $table->string('dimension', 50)->nullable()->index('idx_raw_dimension');
            $table->string('added_by', 7)->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate()->nullable()->useCurrent();
            $table->string('canonical_body_size', 32)->nullable()->storedAs('(case when regexp_like(lower(`dimension`),_utf8mb4\'^[0-9]*.?[0-9]+[xX][0-9]*.?[0-9]+.*$\') then concat(trim(trailing _utf8mb4\'.\' from trim(trailing _utf8mb4\'0\' from least(cast(substring_index(lower(`dimension`),_utf8mb4\'x\',1) as decimal(10,4)),cast(substring_index(substring_index(lower(`dimension`),_utf8mb4\'x\',2),_utf8mb4\'x\',-(1)) as decimal(10,4))))),_utf8mb4\'x\',trim(trailing _utf8mb4\'.\' from trim(trailing _utf8mb4\'0\' from greatest(cast(substring_index(lower(`dimension`),_utf8mb4\'x\',1) as decimal(10,4)),cast(substring_index(substring_index(lower(`dimension`),_utf8mb4\'x\',2),_utf8mb4\'x\',-(1)) as decimal(10,4)))))) else lower(`dimension`) end)');
            $table->string('raw_package_normalized')->nullable()->storedAs('replace(replace(`raw_package`,_utf8mb4\'-\',_utf8mb4\'\'),_utf8mb4\'_\',_utf8mb4\'\')')->index('idx_raw_package_normalized');

            $table->index(['dimension', 'id', 'package_id'], 'idx_raw_dimension_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('f3_raw_packages');
    }
};
