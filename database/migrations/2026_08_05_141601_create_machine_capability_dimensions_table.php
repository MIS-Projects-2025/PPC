<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Body size restriction for a SPECIFIC package-within-config, not
     * the config as a whole — the same config can require different
     * sizes for different packages (e.g. LFCSP restricted to 2x2,
     * DDPAK on that same config restricted to 3x3).
     *
     * No rows for a given capability_package_id = that package, under
     * that config, is unrestricted on size.
     *
     * body_size is stored sanitized (pre-sorted, consistent case and
     * format) — no lookup table; the same normalization function is
     * used on write and on query.
     */
    public function up(): void
    {
        Schema::create('machine_capability_dimensions', function (Blueprint $table) {
            $table->unsignedBigInteger('capability_package_id');
            $table->string('body_size', 20);

            $table->primary(['capability_package_id', 'body_size']);
            $table->foreign('capability_package_id')
                ->references('id')->on('machine_capability_packages')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('machine_capability_dimensions');
    }
};
