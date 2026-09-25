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
        Schema::create('employee_masterlist', function (Blueprint $table) {
            $table->integer('EMPID', true);
            $table->string('EMPLOYID', 50);
            $table->string('EMPNAME', 200);
            $table->string('EMPPOSITION', 10)->comment('0-ADMINISTRATOR
1-RANK AND FILE
2-SUPERVISOR
3-SECTION HEAD
4-MANAGER
5-DIRECTOR
6-PRESIDENT');
            $table->text('JOB_TITLE');
            $table->string('COMPANY', 30);
            $table->string('DEPARTMENT', 200);
            $table->string('PRODLINE', 100)->nullable();
            $table->text('STATION');
            $table->string('TEAM', 50)->nullable()->default('\'na\'');
            $table->smallInteger('EMPSTATUS')->comment('0-PROBATIONARY
1-PERMANENT');
            $table->smallInteger('EMPCLASS')->comment('1-DIRECT
2-NON-EXEMPT
3-EXEMPT
4-SECTION HEAD
5-MANAGER
6-SENIOR MANAGEMENT');
            $table->string('SHIFTTYPE', 50)->nullable()->comment('1-NORMAL
2-SHIFTING');
            $table->string('EMPSEX', 10)->default('\'MALE\'')->comment('1-MALE
2-FEMALE');
            $table->date('BIRTHDAY');
            $table->date('DATEHIRED');
            $table->date('DATEREG')->nullable();
            $table->string('EMAIL', 250);
            $table->string('USERNAME', 30)->nullable();
            $table->text('PASSWRD');
            $table->string('ACCSTATUS', 10)->default('NO')->comment('1-ACTIVE
2-INACTIVE');
            $table->string('APPROVER1', 250);
            $table->string('APPROVER1_1', 250);
            $table->string('APPROVER2', 250);
            $table->string('APPROVER2_1', 250);
            $table->string('APPROVER2_2', 250)->nullable()->default('na');
            $table->dateTime('date_created')->useCurrent();
            $table->dateTime('date_updated')->useCurrentOnUpdate()->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_masterlist');
    }
};
