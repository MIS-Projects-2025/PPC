<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('focus_group_factory', function (Blueprint $table) {
            $table->id();
            $table->string('focus_group', 20);
            $table->string('factory', 10);
            $table->timestamps();

            $table->unique('focus_group', 'idx_focus_group');
            $table->index('factory', 'idx_factory');
        });

        DB::table('focus_group_factory')->insert([
            ['focus_group' => 'AER', 'factory' => 'F1'],
            ['focus_group' => 'COM', 'factory' => 'F1'],
            ['focus_group' => 'CV', 'factory' => 'F2'],
            ['focus_group' => 'DLT', 'factory' => 'F1'],
            ['focus_group' => 'HPC', 'factory' => 'F1'],
            ['focus_group' => 'HPCA', 'factory' => 'F1'],
            ['focus_group' => 'HPCC', 'factory' => 'F1'],
            ['focus_group' => 'HPCS', 'factory' => 'F1'],
            ['focus_group' => 'INT', 'factory' => 'F1'],
            ['focus_group' => 'LT', 'factory' => 'F2'],
            ['focus_group' => 'LTCL', 'factory' => 'F2'],
            ['focus_group' => 'LTI', 'factory' => 'F2'],
            ['focus_group' => 'MIC', 'factory' => 'F1'],
            ['focus_group' => 'MIC_WL', 'factory' => 'F1'],
            ['focus_group' => 'MPD', 'factory' => 'F1'],
            ['focus_group' => 'RFC', 'factory' => 'F1'],
            ['focus_group' => 'STR', 'factory' => 'F1'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('focus_group_factory');
    }
};
