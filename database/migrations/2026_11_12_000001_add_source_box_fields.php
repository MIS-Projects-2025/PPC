<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lot_stagings', function (Blueprint $t) {
            // External group identity. box_group_id keeps its meaning: one physical box set.
            $t->string('box_source', 20)->nullable()->after('box_group_id');
            $t->unsignedBigInteger('source_group_id')->nullable()->after('box_source');
            // ORIGINAL box_details text from the source (identity of the box set), not the override.
            $t->string('box_details', 100)->nullable()->after('source_group_id');
            $t->index(['box_source', 'source_group_id'], 'lot_stagings_source_group_idx');
        });

        Schema::create('box_info_overrides', function (Blueprint $t) {
            $t->id();
            $t->string('box_source', 20);
            $t->string('group_key', 64);              // "g:<box_group_id>" or "l:<lot id>" when the source has no group
            $t->string('set_key', 100)->default('');  // lower(trim(original box_details))
            $t->string('original_box_details', 100)->nullable();
            $t->unsignedInteger('original_no_of_box')->nullable();
            $t->string('box_details', 100)->nullable();
            $t->unsignedInteger('no_of_box')->nullable();
            $t->string('changed_by', 50);
            $t->timestamps();

            $t->unique(['box_source', 'group_key', 'set_key'], 'box_info_overrides_key_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('box_info_overrides');

        Schema::table('lot_stagings', function (Blueprint $t) {
            $t->dropIndex('lot_stagings_source_group_idx');
            $t->dropColumn(['box_source', 'source_group_id', 'box_details']);
        });
    }
};
