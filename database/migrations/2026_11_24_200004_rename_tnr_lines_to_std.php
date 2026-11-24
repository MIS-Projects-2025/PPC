<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /** The old TNR sheets (F1/F2/F3) become the "STD" lines; the TRAY lines start empty. */
    public function up(): void
    {
        foreach (['F1', 'F2', 'F3'] as $line) {
            DB::table('hourly_sheets')->where('type', 'tnr')->where('line', $line)->update(['line' => "$line STD"]);
        }
    }

    public function down(): void
    {
        foreach (['F1', 'F2', 'F3'] as $line) {
            DB::table('hourly_sheets')->where('type', 'tnr')->where('line', "$line STD")->update(['line' => $line]);
        }
    }
};
