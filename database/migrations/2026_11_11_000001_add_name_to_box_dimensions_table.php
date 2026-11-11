<?php

use App\Models\BoxDimension;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $table = (new BoxDimension)->getTable();

        if (Schema::hasColumn($table, 'name')) {
            return; // already applied directly in Workbench
        }

        Schema::table($table, fn(Blueprint $t) => $t->string('name', 100)->nullable()->after('id'));

        // Existing rows get a placeholder; BoxDimensionSeeder adopts them by length/height.
        DB::table($table)->update(['name' => DB::raw("CONCAT('legacy-', id)")]);

        Schema::table($table, function (Blueprint $t) {
            $t->string('name', 100)->nullable(false)->change();
            $t->unique('name');
        });
    }

    public function down(): void
    {
        Schema::table((new BoxDimension)->getTable(), function (Blueprint $t) {
            $t->dropUnique(['name']);
            $t->dropColumn('name');
        });
    }
};
