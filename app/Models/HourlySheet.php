<?php

namespace App\Models;

use App\Models\Concerns\TracksActor;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** One sheet per (date, type, line): tnr/F1..F3 (machine rows), fvi/PL1,PL6 (employee rows). */
class HourlySheet extends Model
{
    use TracksActor;

    public const TYPE_TNR = 'tnr';
    public const TYPE_FVI = 'fvi';

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

    /** The relation that matches this sheet's type (use for queries). */
    public function rows(): HasMany
    {
        return $this->type === self::TYPE_FVI ? $this->fviRows() : $this->machineRows();
    }

    /** Eager-loaded rows of the matching type (load machineRows/fviRows first). */
    public function loadedRows(): Collection
    {
        return $this->type === self::TYPE_FVI ? $this->fviRows : $this->machineRows;
    }

    /** @return class-string<HourlyRow> */
    public function rowModelClass(): string
    {
        return $this->type === self::TYPE_FVI ? FviHourlyRow::class : MachineHourlyRow::class;
    }
}
