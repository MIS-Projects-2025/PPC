<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rack_pages', function (Blueprint $table) {
            $table->id();
            $table->string('key', 30)->unique();
            $table->string('label', 100);
            $table->timestamps();
        });

        // Seed the pages that currently exist as PL1 / PL6 views, plus the new
        // residual-controller page. Adjust labels as needed.
        DB::table('rack_pages')->insert([
            [
                'key' => 'PL1',
                'label' => 'PL1',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'PL6',
                'label' => 'PL6',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'RESCON',
                'label' => 'Residual Controller',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('rack_pages');
    }
};
