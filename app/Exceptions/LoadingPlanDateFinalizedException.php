<?php

namespace App\Exceptions;

use Exception;

class LoadingPlanDateFinalizedException extends Exception
{
    public function __construct(
        public readonly string $scheduledDate,
        public readonly ?int $entryId = null,
    ) {
        $suffix = $entryId ? " (entry #{$entryId})" : '';
        parent::__construct("Loading plan for {$scheduledDate} is finalized and can no longer be modified{$suffix}.");
    }
}
