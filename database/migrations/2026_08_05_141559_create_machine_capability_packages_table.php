<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which package(s) a given capability config accepts. QFN and DFN
     * each get their own row pointing at ppc_package_master — no
     * equivalence collapsing.
     *
     * required_factory scopes acceptance to a specific focus group
     * (e.g. "LFCSP only if F1"); NULL = no scoping.
     *
     * package_id is intentionally NOT a DB-level foreign key — per
     * scope, ppc_package_master isn't being created in this migration
     * set, so referential integrity for package_id is enforced at the
     * application layer. Revisit once ppc_package_master's actual
     * connection/schema is confirmed.
     */
    public function up(): void
    {
        Schema::create('machine_capability_packages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('capability_id');
            $table->unsignedInteger('package_id'); // references ppc_package_master.id — no DB-level FK (table not managed here)
            $table->string('required_factory', 20)->nullable();

            $table->unique(
                ['capability_id', 'package_id', 'required_factory'],
                'uq_capability_package_factory'
            );

            $table->foreign('capability_id')
                ->references('capability_id')->on('machine_capability_configs')
                ->cascadeOnDelete();

            $table->index('package_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('machine_capability_packages');
    }
};
