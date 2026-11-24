<?php

namespace App\Services\HourlyMonitoring;

use App\Models\HourlySheet;
use Illuminate\Database\Eloquent\Collection;

class SheetService
{
    /**
     * Returns every sheet of the day, creating the missing ones.
     * A newly created sheet is seeded from the latest earlier sheet of the same type+line
     * (see config hourly_monitoring.carry_over); the very first day starts empty.
     *
     * Note: this writes on a GET (opening a date creates its sheets). Concurrent opens are safe
     * thanks to the unique (sheet_date, type, line) index + createOrFirst.
     */
    public function openDay(string $date): Collection
    {
        foreach (config('hourly_monitoring.lines') as $type => $lines) {
            foreach ($lines as $line) {
                $sheet = HourlySheet::createOrFirst(['sheet_date' => $date, 'type' => $type, 'line' => $line]);

                if ($sheet->wasRecentlyCreated) {
                    $this->carryOver($sheet);
                }
            }
        }

        return $this->forDay($date);
    }

    public function forDay(string $date): Collection
    {
        $order = [];
        foreach (config('hourly_monitoring.lines') as $type => $lines) {
            foreach ($lines as $line) {
                $order[] = "$type:$line";
            }
        }

        return HourlySheet::query()
            ->where('sheet_date', $date)
            ->with(HourlySheet::EAGER)
            ->get()
            ->sortBy(fn (HourlySheet $s) => array_search("{$s->type}:{$s->line}", $order, true))
            ->values();
    }

    private function carryOver(HourlySheet $sheet): void
    {
        $previous = HourlySheet::query()
            ->where('type', $sheet->type)
            ->where('line', $sheet->line)
            ->where('sheet_date', '<', $sheet->sheet_date->toDateString())
            ->orderByDesc('sheet_date')
            ->first();

        if (! $previous) {
            return;
        }

        $fields = config("hourly_monitoring.carry_over.{$sheet->type}", []);
        $model  = $sheet->rowModelClass();

        foreach ($previous->rows()->get() as $row) {
            $model::create(
                ['hourly_sheet_id' => $sheet->id, 'sort_order' => $row->sort_order] + $row->only($fields)
            );
        }
    }
}
