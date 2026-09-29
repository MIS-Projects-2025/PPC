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
        Schema::create('f3', function (Blueprint $table) {
            $table->increments('id');
            $table->decimal('running_ct', 6)->nullable();
            $table->dateTime('date_received')->nullable();
            $table->string('packing_list_srf', 175)->nullable();
            $table->string('po_number', 175)->nullable();
            $table->string('machine_number', 175)->nullable();
            $table->string('part_number', 175)->nullable();
            $table->string('package_code', 175)->nullable();
            $table->integer('package')->nullable();
            $table->string('lot_number', 175)->nullable();
            $table->string('process_req', 175)->nullable();
            $table->integer('qty')->nullable();
            $table->integer('good')->nullable();
            $table->integer('rej')->nullable();
            $table->integer('res')->nullable();
            $table->date('date_commit')->nullable();
            $table->dateTime('actual_date_time')->nullable();
            $table->string('status', 175)->nullable();
            $table->string('do_number', 300)->nullable();
            $table->text('remarks')->nullable();
            $table->integer('doable')->nullable();
            $table->string('focus_group', 175)->nullable();
            $table->string('gap_analysis', 175)->nullable();
            $table->decimal('cycle_time', 6)->nullable();
            $table->string('imported_by', 11)->nullable();
            $table->dateTime('date_loaded')->nullable()->index('idx_f3_date');
            $table->timestamp('modified_at')->useCurrentOnUpdate()->nullable()->useCurrent();
            $table->string('modified_by', 11)->nullable();
            $table->date('import_date')->nullable()->default(DB::raw('(CURDATE())'));
            $table->string('production_line', 15)->nullable()->index('idx_wip_production_line');

            $table->index(['package', 'date_loaded'], 'idx_f3_date_package');
            $table->index(['date_loaded', 'package'], 'idx_f3_date_package_2');
            $table->index(['status', 'date_loaded', 'package'], 'idx_f3_status_date_package');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('f3');
    }
};
