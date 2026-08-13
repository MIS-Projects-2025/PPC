<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->unsignedInteger('machine_id')->nullable()->after('machine');
            $table->index('machine_id');
        });

        $this->backfillMachineIds();
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropIndex(['machine_id']);
            $table->dropColumn('machine_id');
        });
    }

    /**
     * Match existing `machine` string values against qdn_db.machine_list
     * and populate machine_id accordingly.
     */
    private function backfillMachineIds(): void
    {
        // Pull a lookup map from the separate qdn_db connection.
        // Adjust which column you match on (machine_num vs model) to whatever
        // the `machine` string actually stored historically.
        $machines = DB::connection('qdn_db')
            ->table('machine_list')
            ->select('id', 'machine_num')
            ->get()
            ->keyBy(fn($row) => strtolower(trim($row->machine_num)));

        $entries = DB::table('loading_plan_entries')
            ->whereNotNull('machine')
            ->where('machine', '!=', '')
            ->select('id', 'machine')
            ->get();

        $unmatched = [];

        foreach ($entries as $entry) {
            $key = strtolower(trim($entry->machine));
            $match = $machines->get($key);

            if ($match) {
                DB::table('loading_plan_entries')
                    ->where('id', $entry->id)
                    ->update(['machine_id' => $match->id]);
            } else {
                $unmatched[] = $entry->id . ' (' . $entry->machine . ')';
            }
        }

        if (! empty($unmatched)) {
            // Don't fail the migration — just surface what needs manual review.
            // Check these rows before running the drop-column migration.
            logger()->warning('LoadingPlanEntry backfill: unmatched machine names', [
                'entries' => $unmatched,
            ]);
        }
    }
};
