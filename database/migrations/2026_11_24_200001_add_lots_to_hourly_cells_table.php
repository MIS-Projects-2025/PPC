<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Boxing slots carry a "No of lots" next to the output. A cell record may now hold
        // output_qty / downtime_code_id, lots, or both. Records with all three NULL are deleted.
        Schema::table('hourly_cells', function (Blueprint $table) {
            $table->unsignedInteger('lots')->nullable()->after('downtime_code_id');
        });
    }

    public function down(): void
    {
        Schema::table('hourly_cells', function (Blueprint $table) {
            $table->dropColumn('lots');
        });
    }
};
