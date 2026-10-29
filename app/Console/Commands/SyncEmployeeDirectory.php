<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncEmployeeDirectory extends Command
{
    protected $signature = 'employees:sync';
    protected $description = 'Copy employee display data from masterlist into the local employee_directory table';

    private const COLUMNS = [
        'EMPLOYID',
        'EMPNAME',
        'FIRSTNAME',
        'LASTNAME',
        'JOB_TITLE',
        'DEPARTMENT',
        'PRODLINE',
        'STATION',
        'EMPPOSITION',
        'EMAIL',
        'DATEHIRED',
        'ACCSTATUS',
    ];

    public function handle(): int
    {
        $now     = now();
        $count   = 0;
        $skipped = 0;

        try {
            DB::connection('masterlist')
                ->table('employee_masterlist')
                ->select(self::COLUMNS)
                ->orderBy('EMPLOYID')
                ->chunk(500, function ($rows) use ($now, &$count, &$skipped) {
                    $data = [];

                    foreach ($rows as $r) {
                        $row = (array) $r;

                        $id = trim((string) ($row['EMPLOYID'] ?? ''));
                        if ($id === '') {
                            $skipped++;
                            continue; // no usable key
                        }

                        $row['EMPLOYID']   = $id;
                        $row['ACCSTATUS']  = $row['ACCSTATUS'] ?? 0;   // NULL status -> treat as inactive
                        $row['DATEHIRED']  = $this->cleanDate($row['DATEHIRED'] ?? null);
                        $row['synced_at']  = $now;

                        $data[$id] = $row; // keyed by id, so duplicate IDs collapse (last one wins)
                    }

                    if (!$data) {
                        return;
                    }

                    DB::table('employee_directory')->upsert(
                        array_values($data),
                        ['EMPLOYID'],
                        array_merge(array_diff(self::COLUMNS, ['EMPLOYID']), ['synced_at'])
                    );

                    $count += count($data);
                });
        } catch (\Throwable $e) {
            Log::error('employees:sync failed', ['error' => $e->getMessage()]);
            $this->error('Sync failed: ' . $e->getMessage());
            return self::FAILURE;
        }

        $this->info("Synced {$count} employees" . ($skipped ? ", skipped {$skipped} with no ID." : '.'));
        return self::SUCCESS;
    }

    private function cleanDate($value): ?string
    {
        if (!$value || str_starts_with((string) $value, '0000')) {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
