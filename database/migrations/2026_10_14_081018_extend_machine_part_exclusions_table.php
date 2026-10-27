
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'qdn_db';

    public function up(): void
    {
        Schema::connection('qdn_db')->table('machine_part_exclusions', function (Blueprint $table) {
            // Keep the same INT type as machine_list.id.
            $table->integer('machine_id')
                ->nullable()
                ->change();

            // Allow rules to target a machine model.
            $table->string('machine_model', 45)
                ->nullable()
                ->after('machine_id');

            // Match part names exactly or by substring.
            $table->enum('match_type', ['exact', 'contains'])
                ->default('exact')
                ->after('part_name');

            // Exclude matching parts or allow only matching parts.
            $table->enum('rule_type', ['exclude', 'include_only'])
                ->default('exclude')
                ->after('match_type');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->table('machine_part_exclusions', function (Blueprint $table) {
            $table->dropColumn([
                'machine_model',
                'match_type',
                'rule_type',
            ]);

            // Restore the original NOT NULL INT column.
            $table->integer('machine_id')
                ->nullable(false)
                ->change();
        });
    }
};
