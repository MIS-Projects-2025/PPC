<?php

namespace App\Observers;

use App\Models\LoadingPlanEntryHistory;

class LoadingPlanEntryObserver extends BaseHistoryObserver
{
    protected array $ignoredColumns = ['updated_at', 'lock_version'];

    protected function historyModelClass(): string
    {
        return LoadingPlanEntryHistory::class;
    }

    protected function parentKeyColumn(): string
    {
        return 'entry_id';
    }
}
