<?php

namespace App\Services\HourlyMonitoring;

use App\Models\HourlyCell;
use App\Models\HourlyRow;
use App\Models\HourlySheet;
use App\Support\Actor;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class HourlyRowService
{
    public function __construct(
        private CellValueParser $parser,
        private EmployeeLookupService $employees,
    ) {
    }

    public function addRow(HourlySheet $sheet): HourlyRow
    {
        $model = $sheet->rowModelClass();
        $next  = ((int) $model::where('hourly_sheet_id', $sheet->id)->max('sort_order')) + 1;

        return $model::create(['hourly_sheet_id' => $sheet->id, 'sort_order' => $next])->load('cells.downtimeCode');
    }

    public function deleteRow(HourlySheet $sheet, int $rowId): void
    {
        $sheet->rows()->findOrFail($rowId)->delete();
    }

    /**
     * Apply a batch of edits (typed values, drag-fill, paste) atomically.
     *
     * @param  list<array{id:int, fields?:array<string,mixed>, cells?:array<int|string,?string>}>  $changes
     * @return Collection<int, HourlyRow>  the updated rows with their cells
     */
    public function apply(HourlySheet $sheet, array $changes): Collection
    {
        $ids    = array_values(array_unique(array_map(fn ($c) => (int) $c['id'], $changes)));
        $actor  = Actor::id();
        $hours  = array_merge(config('hourly_monitoring.day_hours'), config('hourly_monitoring.night_hours'));

        return DB::transaction(function () use ($sheet, $changes, $ids, $actor, $hours) {
            $rows    = $sheet->rows()->whereIn('id', $ids)->get()->keyBy('id');
            $errors  = [];
            $upserts = [];
            $deletes = []; // [rowId => [hours]]

            foreach ($changes as $i => $change) {
                /** @var HourlyRow|null $row */
                $row = $rows->get((int) $change['id']);

                if (! $row) {
                    $errors["rows.$i.id"] = 'This row does not belong to the sheet.';
                    continue;
                }

                $this->applyFields($row, $change['fields'] ?? [], "rows.$i.fields", $errors);

                foreach (($change['cells'] ?? []) as $hour => $raw) {
                    $valid  = ctype_digit((string) $hour) && in_array((int) $hour, $hours, true);
                    $parsed = $valid ? $this->parser->parse($raw) : null;

                    if ($parsed === null) {
                        $errors["rows.$i.cells.$hour"] = '"' . $raw . '" is neither a whole number nor a known downtime code.';
                        continue;
                    }

                    if ($parsed['qty'] === null && $parsed['code_id'] === null) {
                        $deletes[$row->id][] = (int) $hour;
                        continue;
                    }

                    $upserts[] = [
                        'rowable_type'     => $row->getMorphClass(),
                        'rowable_id'       => $row->id,
                        'hour'             => (int) $hour,
                        'output_qty'       => $parsed['qty'],
                        'downtime_code_id' => $parsed['code_id'],
                        'updated_by'       => $actor,
                        'created_at'       => now(),
                        'updated_at'       => now(),
                    ];
                }
            }

            if ($errors) {
                throw ValidationException::withMessages($errors); // nothing has been written yet
            }

            foreach ($rows as $row) {
                if ($row->isDirty()) {
                    $row->save();
                }
            }

            if ($upserts) {
                HourlyCell::upsert(
                    $upserts,
                    ['rowable_type', 'rowable_id', 'hour'],
                    ['output_qty', 'downtime_code_id', 'updated_by', 'updated_at']
                );
            }

            foreach ($deletes as $rowId => $clearHours) {
                $row = $rows->get($rowId);
                HourlyCell::where('rowable_type', $row->getMorphClass())
                    ->where('rowable_id', $rowId)
                    ->whereIn('hour', $clearHours)
                    ->delete();
            }

            return $sheet->rows()->whereIn('id', $ids)->with('cells.downtimeCode')->get();
        });
    }

    /** @param array<string,string> $errors */
    private function applyFields(HourlyRow $row, array $fields, string $path, array &$errors): void
    {
        // Whitelist: names/snapshots can never be written by the client.
        $fields = Arr::only($fields, array_keys($row::editableRules()));

        foreach (['day', 'night'] as $shift) {
            $key = "{$shift}_emp_id";

            if (! array_key_exists($key, $fields)) {
                continue;
            }

            $id = trim((string) ($fields[$key] ?? ''));

            if ($id === '') {
                $fields[$key] = null;
                $fields["{$shift}_emp_name"] = null;
            } elseif ($id === $row->{$key}) {
                unset($fields[$key]); // unchanged: keep the existing name snapshot
            } else {
                $name = $this->employees->nameFor($id);

                if ($name === null) {
                    $errors["$path.$key"] = "Employee ID {$id} was not found in the masterlist.";
                    unset($fields[$key]);
                    continue;
                }

                $fields[$key] = $id;
                $fields["{$shift}_emp_name"] = $name; // snapshot
            }
        }

        $row->fill($fields);
    }
}
