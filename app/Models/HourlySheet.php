<?php

namespace App\Models;

use App\Models\Concerns\TracksActor;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One sheet per (date, type, line):
 *   tnr/F1 STD..F3 TRAY (machine rows), fvi/PL1,PL6 (employee rows), boxing/F1..F3 (employee rows per shift).
 */
class HourlySheet extends Model
{
    use TracksActor;

    public const TYPE_TNR    = 'tnr';
    public const TYPE_FVI    = 'fvi';
    public const TYPE_BOXING = 'boxing';

    /** Relations to eager-load before a sheet goes through HourlySheetResource. */
    public const EAGER = [
        'machineRows.cells.downtimeCode',
        'fviRows.cells.downtimeCode',
        'boxingRows.cells.downtimeCode',
    ];

    protected $fillable = ['sheet_date', 'type', 'line'];

    protected $casts = ['sheet_date' => 'date:Y-m-d'];

    public function machineRows(): HasMany
    {
        return $this->hasMany(MachineHourlyRow::class)->orderBy('sort_order')->orderBy('id');
    }

    public function fviRows(): HasMany
    {
        return $this->hasMany(FviHourlyRow::class)->orderBy('sort_order')->orderBy('id');
    }

    public function boxingRows(): HasMany
    {
        return $this->hasMany(BoxingHourlyRow::class)->orderBy('sort_order')->orderBy('id');
    }

    private function rowRelation(): string
    {
        return match ($this->type) {
            self::TYPE_FVI    => 'fviRows',
            self::TYPE_BOXING => 'boxingRows',
            default           => 'machineRows',
        };
    }

    /** The relation that matches this sheet's type (use for queries). */
    public function rows(): HasMany
    {
        return $this->{$this->rowRelation()}();
    }

    /** Eager-loaded rows of the matching type (load HourlySheet::EAGER first). */
    public function loadedRows(): Collection
    {
        return $this->{$this->rowRelation()};
    }

    /** @return class-string<HourlyRow> */
    public function rowModelClass(): string
    {
        return match ($this->type) {
            self::TYPE_FVI    => FviHourlyRow::class,
            self::TYPE_BOXING => BoxingHourlyRow::class,
            default           => MachineHourlyRow::class,
        };
    }
}
