<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The database connection that should be used by the migration.
     */
    protected $connection = 'qdn_db';

    public function up(): void
    {
        Schema::connection($this->connection)->table('package_list', function (Blueprint $table) {
            $table->boolean('bake')->nullable()->default(null)->after('is_auto_part');
            $table->boolean('brand')->nullable()->default(null)->after('bake');
            $table->boolean('sort')->nullable()->default(null)->after('brand');
            $table->boolean('lpi')->nullable()->default(null)->after('sort');
        });
    }

    public function down(): void
    {
        Schema::connection($this->connection)->table('package_list', function (Blueprint $table) {
            $table->dropColumn(['bake', 'brand', 'sort', 'lpi']);
        });
    }
};
