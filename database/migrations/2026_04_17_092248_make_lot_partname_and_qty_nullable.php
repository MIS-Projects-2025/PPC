<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lots', function (Blueprint $table) {
            // Making partname and qty nullable
            $table->string('partname', 255)->nullable()->change();
            $table->unsignedInteger('qty')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('lots', function (Blueprint $table) {
            // Reverting to NOT NULL (Ensure no NULLs exist before rolling back)
            $table->string('partname', 255)->nullable(false)->change();
            $table->unsignedInteger('qty')->nullable(false)->change();
        });
    }
};
