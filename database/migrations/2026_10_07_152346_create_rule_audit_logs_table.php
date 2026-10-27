<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'qdn_db';

    public function up(): void
    {
        Schema::connection('qdn_db')->create('rule_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 20);
            $table->string('table_name', 64);
            $table->unsignedBigInteger('machine_id')->nullable()->index();
            $table->json('snapshot');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->dropIfExists('rule_audit_logs');
    }
};
