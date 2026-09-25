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
        Schema::table('body_size_capacity_profiles', function (Blueprint $table) {
            $table->foreign(['body_size_capacity_profile_instance_id'], 'body_size_capacity_profile_instance_id')->references(['id'])->on('body_size_capacity_profile_instances')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['body_size_id'], 'body_size_capacity_profiles_ibfk_1')->references(['id'])->on('body_sizes')->onUpdate('no action')->onDelete('no action');
            $table->foreign(['machine_id'], 'body_size_capacity_profiles_ibfk_2')->references(['id'])->on('machines')->onUpdate('no action')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('body_size_capacity_profiles', function (Blueprint $table) {
            $table->dropForeign('body_size_capacity_profile_instance_id');
            $table->dropForeign('body_size_capacity_profiles_ibfk_1');
            $table->dropForeign('body_size_capacity_profiles_ibfk_2');
        });
    }
};
