<?php

namespace App\Exceptions;

use App\Models\LoadingPlanEntry;
use Exception;

/**
 * Thrown when a field edit's expected lock_version no longer matches the
 * row in the database — someone else edited it first. Carries the current
 * server-side row so the client can show/merge the up-to-date value
 * instead of blindly overwriting it.
 */
class StaleWriteException extends Exception
{
    public function __construct(
        public readonly ?LoadingPlanEntry $current,
    ) {
        parent::__construct('This entry was modified by someone else. Refresh to see the latest value.');
    }
}
