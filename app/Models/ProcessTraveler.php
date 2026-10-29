<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProcessTraveler extends Model
{
    use SoftDeletes;

    protected $table = 'process_travelers';

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'date_created' => 'datetime',
        'date_updated' => 'datetime',
        'time_remarks' => 'datetime',
        'process_rqmt' => 'integer',   // after the Darwin migration
        'qty'          => 'decimal:3',
    ];

    /** DB stores 'yes'/'no' (varchar(3)); the model exposes a boolean. */
    protected function forBake(): Attribute
    {
        return Attribute::make(
            get: fn($v) => strtolower(trim((string) $v)) === 'yes',
            set: fn($v) => filter_var($v, FILTER_VALIDATE_BOOLEAN) || strtolower((string) $v) === 'yes' ? 'yes' : 'no',
        );
    }

    /**
     * F3 production day: 12:00 -> 12:00 next day.
     * Uses the default (non-trashed) scope on purpose: this feeds the pool of
     * lots that can still be shown/placed. Lookups for lots that already have
     * an entry go through LotSourceService::find(), which uses withTrashed().
     * 
     * For now, all f3 will be fetch as unassigned. this is deprecated
     */
    public function scopeForPlanDate(Builder $q, string $date): Builder
    {
        $start = Carbon::parse($date)->setTime(12, 0, 0);

        return $q->where('date_created', '>=', $start)
            ->where('date_created', '<', $start->copy()->addDay());
    }

    /**
     * Adapter: express this traveler as an UNSAVED CustomerDataWip so that
     * createPlannedLot, LoadingPlanFormulas and the hydrators work unchanged.
     * Never call ->save() on the returned instance.
     */
    public function toWip(): CustomerDataWip
    {
        $w = new CustomerDataWip();
        $w->forceFill([
            'Lot_Id'       => $this->lot_number,
            'Part_Name'    => $this->part_number,
            'Lead_Count'   => $this->pkg_code,        // F3: pkg_code shown in the lead_count column
            'Package_Name' => $this->package_size,    // F3: package_size shown in the package_name column
            'Ramp_Time'    => $this->input_type,
            'Bake'         => $this->for_bake ? 'For Bake' : null,
            'Qty'          => (int) round((float) $this->qty),
            'import_date'  => $this->date_created?->toDateString(),
        ]);

        // In-memory only; read through accessors on CustomerDataWip
        $w->setAttribute('source', 'f3');
        $w->setAttribute('traveler_id', $this->id);
        $w->setAttribute('traveler_deleted', $this->trashed());
        $w->setAttribute('traveler_remarks', $this->remarks);

        return $w;
    }
}
