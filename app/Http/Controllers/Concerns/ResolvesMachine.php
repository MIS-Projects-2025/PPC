<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\DB;

trait ResolvesMachine
{
    /**
     * Accepts a machine_list.id (e.g. 12) or a machine_num (e.g. "01ST60A01").
     * An all-digit value is tried as an id first, then as a machine_num.
     */
    protected function resolveMachine(int|string $machine): object
    {
        $query = DB::connection('qdn_db')->table('machine_list')
            ->select('id', 'machine_num', 'factory');

        $value = (string) $machine;
        $m = null;

        if (ctype_digit($value)) {
            $m = (clone $query)->where('id', (int) $value)->first();
        }

        $m ??= (clone $query)->where('machine_num', $value)->first();

        abort_unless($m, 404, 'Machine not found.');

        return $m;
    }

    protected function resolveMachineId(int|string $machine): int
    {
        return (int) $this->resolveMachine($machine)->id;
    }
}
