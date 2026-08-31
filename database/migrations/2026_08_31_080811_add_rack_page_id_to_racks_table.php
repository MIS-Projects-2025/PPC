<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('racks', function (Blueprint $table) {
            // Nullable for now so we can backfill existing rows before
            // tightening it below. Placed after production_line_id since
            // that column now represents physical location only, while
            // rack_page_id decides which page/view the rack shows up on.
            $table->foreignId('rack_page_id')
                ->nullable()
                ->after('production_line_id')
                ->constrained('rack_pages')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });

        // Backfill existing racks, including soft-deleted ones (they still
        // hold a NOT NULL rack_page_id once the column is tightened below).
        // production_line_id 1 => PL1, production_line_id 2 => PL6. This is
        // NOT a general "PLx id => PLx" formula — it's specific to this
        // dataset's production_lines rows. Update the mapping below if your
        // production_lines table uses different ids for PL1/PL6, or add more
        // entries if there are other production lines with racks.
        $pageIds = DB::table('rack_pages')->pluck('id', 'key');

        $productionLineToPage = [
            1 => $pageIds['PL1'],
            2 => $pageIds['PL6'],
        ];

        foreach ($productionLineToPage as $productionLineId => $rackPageId) {
            DB::table('racks')
                ->where('production_line_id', $productionLineId)
                ->update(['rack_page_id' => $rackPageId]);
        }

        // Anything still NULL here means a production_line_id wasn't covered
        // by the mapping above — the NOT NULL change below will fail loudly
        // rather than silently leaving racks unmapped.

        Schema::table('racks', function (Blueprint $table) {
            $table->foreignId('rack_page_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('racks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('rack_page_id');
        });
    }
};
