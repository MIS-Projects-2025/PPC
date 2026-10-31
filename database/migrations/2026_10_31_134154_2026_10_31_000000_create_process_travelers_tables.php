<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('process_travelers')) {
            Schema::create('process_travelers', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->charset = 'utf8mb4';
                $table->collation = 'utf8mb4_0900_ai_ci';

                $table->id();
                $table->dateTime('date_created');
                $table->string('packing_list_srf', 100);
                $table->string('po_number', 100)->nullable();
                $table->string('input_type', 20);
                $table->string('part_number', 150);
                $table->string('pkg_code', 100);
                $table->string('package_size', 100);
                $table->string('lot_number', 100);
                $table->integer('process_rqmt');
                $table->integer('qty');
                $table->text('remarks')->nullable();
                $table->dateTime('time_remarks')->nullable();
                $table->string('for_bake', 3);
                $table->string('created_by', 150);
                $table->dateTime('date_updated');
                $table->string('updated_by', 150);
                $table->softDeletes();

                $table->index('date_created', 'process_travelers_date_created_index');
                $table->index(['date_created', 'input_type'], 'process_travelers_date_input_index');
                $table->index(['date_created', 'for_bake'], 'process_travelers_date_bake_index');
                $table->index('lot_number', 'process_travelers_lot_number_index');
            });
        }

        if (! Schema::hasTable('process_traveler_activity_logs')) {
            Schema::create('process_traveler_activity_logs', function (Blueprint $table) {
                $table->engine = 'InnoDB';
                $table->charset = 'utf8mb4';
                $table->collation = 'utf8mb4_unicode_ci';

                $table->id();
                $table->unsignedBigInteger('process_traveler_id');
                $table->string('action', 50);
                $table->string('station', 150)->nullable();
                $table->text('remarks')->nullable();
                $table->json('old_values')->nullable();
                $table->json('new_values')->nullable();
                $table->string('performed_by', 150);
                $table->dateTime('performed_at');

                $table->index(['process_traveler_id', 'performed_at'], 'pt_activity_record_time_index');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('process_traveler_activity_logs');
        Schema::dropIfExists('process_travelers');
    }
};
