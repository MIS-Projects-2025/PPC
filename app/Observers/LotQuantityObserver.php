<?php

namespace App\Observers;

use App\Models\LotQuantityHistory;
use Illuminate\Database\Eloquent\Model;

class LotQuantityObserver extends BaseHistoryObserver
{
    protected function historyModelClass(): string
    {
        return LotQuantityHistory::class;
    }

    protected function parentKeyColumn(): string
    {
        return 'lot_quantity_id';
    }

    protected function extraColumns(Model $model): array
    {
        return [
            'lot_id'         => $model->lot_id,
            'scheduled_date' => $model->scheduled_date,
        ];
    }
}
