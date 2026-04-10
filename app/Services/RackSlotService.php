<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;

class RackSLotService
{
    public function __construct(
        protected RackSlotRepositoryInterface    $slots,
    ) {}

    public function markFull($id, $by)
    {
        DB::transaction(function () use ($id, $by) {
            $this->slots->markFull($id, $by);
        });
    }

    public function clearFull($id)
    {
        DB::transaction(function () use ($id) {
            $this->slots->clearFull($id);
        });
    }
}
