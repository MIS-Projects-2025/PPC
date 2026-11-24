<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PickUp extends Model
{
    use HasFactory;

    protected $table = 'ppc_pickupdb';

    protected $primaryKey = 'id_pickup';

    protected $fillable = [
        "PARTNAME",
        "LOTID",
        "QTY",
        "PACKAGE",
        "LC",
        "no_of_box",
        "box_group_id",
        "ADDED_BY",
    ];

    protected $casts = [
        'DATE_CREATED' => 'datetime',
    ];

    public $timestamps = false;

    public function addedBy()
    {
        return $this->belongsTo(Employee::class, 'ADDED_BY', 'EMPLOYID');
    }

    public function toWip(?PartName $part = null): CustomerDataWip
    {
        return (new CustomerDataWip())->forceFill([
            'Lot_Id'       => $this->LOTID,
            'Part_Name'    => $this->PARTNAME,
            'Package_Name' => trim((string) $this->PACKAGE),
            'Date_Loaded'  => $this->DATE_CREATED?->toDateTimeString(),
            'Lead_Count'   => $this->LC,
            'Qty'          => (int) $this->QTY,
            'Focus_Group'  => $part?->focus_grp,
            'Body_Size'    => $part?->dimensions,
            'Ramp_Time'    => $part?->allocation,
            // in-memory only: a pickup has no customer_data_id, so the grid keys / flags the row with these
            'pickup_id'        => $this->id_pickup,
            'is_pickup_source' => true,
        ]);
    }
}
