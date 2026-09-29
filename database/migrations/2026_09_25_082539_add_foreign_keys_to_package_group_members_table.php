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
        Schema::table('package_group_members', function (Blueprint $table) {
            if (Schema::hasTable('package_groups')) {
                $table->foreign(['group_id'], 'fk_group')->references(['id'])->on('package_groups')->onUpdate('no action')->onDelete('cascade');
                $table->foreign(['group_id'], 'package_group_members_ibfk_2')->references(['id'])->on('package_groups')->onUpdate('no action')->onDelete('no action');
            }

            $table->foreign(['package_id'], 'package_group_members_ibfk_1')->references(['id'])->on('packages')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('package_group_members', function (Blueprint $table) {
            $table->dropForeign('package_group_members_ibfk_1');

            if (Schema::hasTable('package_groups')) {
                $table->dropForeign('fk_group');
                $table->dropForeign('package_group_members_ibfk_2');
            }
        });
    }
};
