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
        Schema::create('lot_commits', function (Blueprint $table) {
            $table->comment('Auto-populated by trg_lot_commit_insert on ppc.customer_data_wip insert. See database/migrations/<this_file_name>.php');
            $table->bigIncrements('id');
            $table->string('Lot_Id', 50)->index('idx_lot_commits_lot_id');
            $table->integer('customer_data_id')->nullable()->unique('uq_lot_commits_customer_data_id');
            $table->integer('Qty');
            $table->integer('recipe_used')->nullable();
            $table->unsignedInteger('recipe_source_id')->nullable()->comment('FK to qdn_db.package_list.id — the specific row recipe_used came from.');
            $table->enum('recipe_status', ['ok', 'no_recipe'])->default('ok');
            $table->integer('commit')->nullable();
            $table->timestamp('computed_at')->useCurrentOnUpdate()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lot_commits');
    }
};
