<?php

namespace App\Services\HourlyMonitoring;

use App\Services\EmployeeDirectory;
use Illuminate\Support\Facades\DB;

/**
 * Employee lookups against the masterlist connection (tspi_hr_db.employee_masterlist).
 * EMPNAME is used as the display name.
 */
class EmployeeLookupService
{
    public function __construct(private EmployeeDirectory $directory)
    {
    }

    /**
     * Type-ahead search by employee ID (prefix) or name (contains).
     *
     * @return list<array{EMPLOYID: string, EMPNAME: string, EMPPOSITION: ?string}>
     */
    public function search(string $term, ?int $limit = null): array
    {
        $term  = trim($term);
        $limit ??= (int) config('hourly_monitoring.employee_search_limit', 15);
        $like  = addcslashes($term, '%_\\');

        return DB::connection('masterlist')
            ->table('employee_masterlist')
            ->select('EMPLOYID', 'EMPNAME', 'EMPPOSITION')
            ->where('ACCSTATUS', 1)
            ->where(function ($q) use ($like) {
                $q->where('EMPLOYID', 'like', $like . '%')
                  ->orWhere('EMPNAME', 'like', '%' . $like . '%');
            })
            ->orderByRaw('(EMPLOYID = ?) DESC, (EMPLOYID LIKE ?) DESC, EMPNAME ASC', [$term, $like . '%'])
            ->limit($limit)
            ->get()
            ->map(fn ($e) => [
                'EMPLOYID'    => (string) $e->EMPLOYID,
                'EMPNAME'     => trim((string) $e->EMPNAME),
                'EMPPOSITION' => $e->EMPPOSITION,
            ])
            ->all();
    }

    /** Exact lookup (uses the existing EmployeeDirectory incl. its cache fallback). Null if not found. */
    public function nameFor(string $empId): ?string
    {
        $employee = $this->directory->find($empId);
        $name = $employee ? trim((string) ($employee->EMPNAME ?? '')) : '';

        return $name !== '' ? $name : null;
    }
}
