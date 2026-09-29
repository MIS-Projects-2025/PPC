<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * machine_list lives in qdn_db, which is shared with other systems —
 * lareact-1 only reads it (via QdnMachine), it doesn't own the schema.
 * Column list mirrors the real table's `SHOW CREATE TABLE` output as of
 * 2026-09-25. This migration is guarded with hasTable(), so it's a safe
 * no-op against the real qdn_db (table already exists there) and a real
 * CREATE against a fresh sqlite test DB.
 *
 * If the real table changes shape later (columns added/renamed by
 * whatever else uses qdn_db), this file won't know — re-run
 * `SHOW CREATE TABLE machine_list;` periodically and diff.
 */
return new class extends Migration
{
    protected $connection = 'qdn_db';

    public function up(): void
    {
        if (Schema::connection('qdn_db')->hasTable('machine_list')) {
            return;
        }

        Schema::connection('qdn_db')->create('machine_list', function (Blueprint $table) {
            $table->increments('id');
            $table->string('machine_num', 45)->nullable();
            $table->string('model', 45)->nullable();
            $table->string('machine_platform', 45)->nullable();
            $table->string('machine_feed_type', 45)->nullable();
            $table->string('pmnt_no', 45)->nullable();
            $table->string('cn_no', 45)->nullable();
            $table->string('serial', 45)->nullable();
            $table->string('machine_manufacturer', 45)->nullable();
            $table->string('status', 45)->nullable();
            $table->string('manufactured_date', 45)->nullable();
            $table->string('location', 45)->nullable();
            $table->string('factory', 45)->nullable();
            $table->string('oem', 45)->nullable();
            $table->string('dimension', 45)->nullable();
            $table->string('input_voltage', 45)->nullable();
            $table->string('phase', 45)->nullable();
            $table->string('hz', 45)->nullable();
            $table->string('amp', 45)->nullable();
            $table->string('age', 45)->nullable();
            $table->string('ownership', 45)->nullable();
            $table->string('created_by', 45)->nullable();
            $table->dateTime('date_created')->nullable()->useCurrent();
            $table->string('updated_by', 45)->nullable();
            $table->dateTime('date_updated')->nullable()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        //
    }
};
