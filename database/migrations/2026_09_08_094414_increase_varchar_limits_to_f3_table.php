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
        Schema::table('f3', function (Blueprint $table) {
            // Originally varchar(50) -> extended to 75
            $table->string('packing_list_srf', 175)->nullable()->change();
            $table->string('po_number', 175)->nullable()->change();
            $table->string('machine_number', 175)->nullable()->change();
            $table->string('part_number', 175)->nullable()->change();
            $table->string('package_code', 175)->nullable()->change();
            $table->string('lot_number', 175)->nullable()->change();
            $table->string('process_req', 175)->nullable()->change();
            $table->string('status', 175)->nullable()->change();
            $table->string('focus_group', 175)->nullable()->change();
            $table->string('gap_analysis', 175)->nullable()->change();

            // Originally varchar(200) from previous prompt -> extended to 300
            $table->string('do_number', 300)->nullable()->change();

            // Originally varchar(10) -> extended to 15
            $table->string('production_line', 15)->nullable()->change();

            // Originally varchar(7) -> extended to 11
            $table->string('imported_by', 11)->nullable()->change();
            $table->string('modified_by', 11)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('f3', function (Blueprint $table) {
            $table->string('packing_list_srf', 50)->nullable()->change();
            $table->string('po_number', 50)->nullable()->change();
            $table->string('machine_number', 50)->nullable()->change();
            $table->string('part_number', 50)->nullable()->change();
            $table->string('package_code', 50)->nullable()->change();
            $table->string('lot_number', 50)->nullable()->change();
            $table->string('process_req', 50)->nullable()->change();
            $table->string('status', 50)->nullable()->change();
            $table->string('focus_group', 50)->nullable()->change();
            $table->string('gap_analysis', 50)->nullable()->change();
            $table->string('do_number', 200)->nullable()->change();
            $table->string('production_line', 10)->nullable()->change();
            $table->string('imported_by', 7)->nullable()->change();
            $table->string('modified_by', 7)->nullable()->change();
        });
    }
};
