<?php

namespace App\Exceptions;

use Exception;

/** Thrown when any row in a bulkEditField batch has a stale lock_version.
 *  Carries every conflicting row's current server-side state, so the
 *  caller can show the user exactly what changed. The whole batch is
 *  rolled back — nothing in it applies, even rows that didn't conflict. */
class BulkStaleWriteException extends Exception
{
    public function __construct(
        public readonly array $conflicts, // LoadingPlanEntry[]
    ) {
        parent::__construct(count($conflicts) . ' row(s) were modified by someone else. Nothing in this batch was saved.');
    }
}
