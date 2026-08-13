<?php

namespace App\Exceptions;

use Exception;

/**
 * Thrown when the gap between two neighboring sequence_order values is too
 * small to safely compute a midpoint without colliding with an existing
 * value (given the column's decimal precision). Callers should rebalance
 * the affected machine's queue and retry.
 */
class SequenceExhaustedException extends Exception
{
    public function __construct(
        public readonly string $machine,
        public readonly string $scheduledDate,
    ) {
        parent::__construct("Sequence order exhausted for machine [{$machine}] on {$scheduledDate}; rebalance required.");
    }
}
