<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Arr;

class EmployeeDirectory
{
    private const TTL_DAYS = 30;
    private const TABLE = 'masterlist_cache';

    private const DISPLAY_COLUMNS = [
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

    /** Live lookup; falls back to cache only if masterlist is unreachable. */
    public function find(string $empId): ?object
    {
        try {
            $row = DB::connection('masterlist')
                ->table('employee_masterlist')
                ->select(array_merge(self::DISPLAY_COLUMNS, ['PASSWRD']))
                ->where('EMPLOYID', $empId)
                ->where('ACCSTATUS', 1)
                ->first();
        } catch (\Throwable $e) {
            Log::warning('Masterlist unreachable, using cache', ['error' => $e->getMessage()]);
            return $this->fromCache($empId);
        }

        if (!$row) {
            // Masterlist is up and says no active employee -> evict
            $this->forget($empId);
            return null;
        }

        $row->from_cache = false;
        return $row;
    }

    public function passwordMatches(object $employee, string $input): bool
    {
        if ($employee->from_cache ?? false) {
            return Hash::check($input, $employee->PASSWRD); // cached value is a bcrypt hash
        }
        return hash_equals((string) $employee->PASSWRD, $input);
    }

    /** Call after a successful live login (or after a password change). */
    public function remember(object $employee): void
    {
        try {
            $payload = Arr::only((array) $employee, self::DISPLAY_COLUMNS);
            unset($payload['PASSWRD'], $payload['from_cache']);

            DB::table(self::TABLE)->updateOrInsert(
                ['emp_id' => $employee->EMPLOYID],
                [
                    'password_hash' => Hash::make((string) $employee->PASSWRD),
                    'payload'       => json_encode($payload, JSON_INVALID_UTF8_SUBSTITUTE),
                    'cached_at'     => now(),
                ]
            );
        } catch (\Throwable $e) {
            Log::error('Failed to cache employee', ['error' => $e->getMessage()]);
        }
    }

    public function forget(string $empId): void
    {
        try {
            DB::table(self::TABLE)->where('emp_id', $empId)->delete();
        } catch (\Throwable $e) {
            Log::error('Failed to evict cached employee', ['error' => $e->getMessage()]);
        }
    }

    private function fromCache(string $empId): ?object
    {
        $row = DB::table(self::TABLE)
            ->where('emp_id', $empId)
            ->where('cached_at', '>=', now()->subDays(self::TTL_DAYS))
            ->first();

        if (!$row) {
            return null;
        }

        return (object) array_merge(
            json_decode($row->payload, true) ?? [],
            ['PASSWRD' => $row->password_hash, 'from_cache' => true]
        );
    }
}
