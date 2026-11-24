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

    /** @param string|null $shift 'day' | 'night' (boxing rows only) */
    public function addRow(HourlySheet $sheet, ?string $shift = null): HourlyRow
    {
        $model = $sheet->rowModelClass();
        $next  = ((int) $model::where('hourly_sheet_id', $sheet->id)->max('sort_order')) + 1;

        $attributes = ['hourly_sheet_id' => $sheet->id, 'sort_order' => $next];

        if ($sheet->type === HourlySheet::TYPE_BOXING) {
            $attributes['shift'] = $shift ?? 'day';
        }

        return $model::create($attributes)->load('cells.downtimeCode');
    }

    public function deleteRow(HourlySheet $sheet, int $rowId): void
    {
        $sheet->rows()->findOrFail($rowId)->delete();
    }

    /**
     * Apply a batch of edits (typed values, drag-fill, paste) atomically.
     *
     * @param  list<array{id:int, fields?:array<string,mixed>, cells?:array<int|string,?string>, lots?:array<int|string,?string>}>  $changes
     * @return Collection<int, HourlyRow>  the updated rows with their cells
     */
    public function apply(HourlySheet $sheet, array $changes): Collection
    {
        $ids   = array_values(array_unique(array_map(fn ($c) => (int) $c['id'], $changes)));
        $actor = Actor::id();
        $hours = array_merge(config('hourly_monitoring.day_hours'), config('hourly_monitoring.night_hours'));
        $morph = $sheet->rowModelClass()::MORPH;

        return DB::transaction(function () use ($sheet, $changes, $ids, $actor, $hours, $morph) {
            $rows   = $sheet->rows()->whereIn('id', $ids)->get()->keyBy('id');
            $errors = [];
            $cells  = []; // output / downtime code per slot (a blank value is stored as NULL/NULL and cleaned up below)
            $lots   = []; // "No of lots" per slot (boxing)

            foreach ($changes as $i => $change) {
                /** @var HourlyRow|null $row */
                $row = $rows->get((int) $change['id']);

                if (! $row) {
                    $errors["rows.$i.id"] = 'This row does not belong to the sheet.';
                    continue;
                }

                $this->applyFields($row, $change['fields'] ?? [], "rows.$i.fields", $errors);

                foreach (($change['cells'] ?? []) as $hour => $raw) {
                    $parsed = $this->validHour($hour, $hours) ? $this->parser->parse($raw) : null;

                    if ($parsed === null) {
                        $errors["rows.$i.cells.$hour"] = '"' . $raw . '" is neither a whole number nor a known downtime code.';
                        continue;
                    }

                    $cells[] = $this->record($morph, $row->id, $hour, $actor) + [
                        'output_qty'       => $parsed['qty'],
                        'downtime_code_id' => $parsed['code_id'],
                    ];
                }

                if (! $row::hasLots()) {
                    continue;
                }

                foreach (($change['lots'] ?? []) as $hour => $raw) {
                    $parsed = $this->validHour($hour, $hours) ? $this->parser->parseWhole($raw) : null;

                    if ($parsed === null) {
                        $errors["rows.$i.lots.$hour"] = '"' . $raw . '" is not a whole number of lots.';
                        continue;
                    }

                    $lots[] = $this->record($morph, $row->id, $hour, $actor) + ['lots' => $parsed['value']];
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

            $key = ['rowable_type', 'rowable_id', 'hour'];

            if ($cells) {
                HourlyCell::upsert($cells, $key, ['output_qty', 'downtime_code_id', 'updated_by', 'updated_at']);
            }

            if ($lots) {
                HourlyCell::upsert($lots, $key, ['lots', 'updated_by', 'updated_at']);
            }

            if ($cells || $lots) {
                // A slot with no output, no code and no lots is simply "no record".
                HourlyCell::where('rowable_type', $morph)
                    ->whereIn('rowable_id', $ids)
                    ->whereNull('output_qty')
                    ->whereNull('downtime_code_id')
                    ->whereNull('lots')
                    ->delete();
            }

            return $sheet->rows()->whereIn('id', $ids)->with('cells.downtimeCode')->get();
        });
    }

    private function validHour(int|string $hour, array $allowed): bool
    {
        return ctype_digit((string) $hour) && in_array((int) $hour, $allowed, true);
    }

    private function record(string $morph, int $rowId, int|string $hour, ?string $actor): array
    {
        return [
            'rowable_type' => $morph,
            'rowable_id'   => $rowId,
            'hour'         => (int) $hour,
            'updated_by'   => $actor,
            'created_at'   => now(),
            'updated_at'   => now(),
        ];
    }

    /** @param array<string,string> $errors */
    private function applyFields(HourlyRow $row, array $fields, string $path, array &$errors): void
    {
        // Whitelist: names/snapshots can never be written by the client.
        $fields = Arr::only($fields, array_keys($row::editableRules()));

        foreach ($row::employeeFields() as $key => $nameKey) {
            if (! array_key_exists($key, $fields)) {
                continue;
            }

            $id = trim((string) ($fields[$key] ?? ''));

            if ($id === '') {
                $fields[$key]     = null;
                $fields[$nameKey] = null;
            } elseif ($id === $row->{$key}) {
                unset($fields[$key]); // unchanged: keep the existing name snapshot
            } else {
                $name = $this->employees->nameFor($id);

                if ($name === null) {
                    $errors["$path.$key"] = "Employee ID {$id} was not found in the masterlist.";
                    unset($fields[$key]);
                    continue;
                }

                $fields[$key]     = $id;
                $fields[$nameKey] = $name; // snapshot
            }
        }

        $row->fill($fields);
    }
}
