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
        Schema::table('machine_capability_dimensions', function (Blueprint $table) {
            $table->foreign(['capability_package_id'])->references(['id'])->on('machine_capability_packages')->onUpdate('no action')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('machine_capability_dimensions', function (Blueprint $table) {
            $table->dropForeign('machine_capability_dimensions_capability_package_id_foreign');
        });
    }
};
