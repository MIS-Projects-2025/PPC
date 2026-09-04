<?php

namespace App\Observers;

use Illuminate\Database\Eloquent\Model;

/**
 * Shared diffing logic for audit-history observers. Subclasses only need
 * to say which history model to write to, which FK column identifies the
 * parent row on that history model, and (optionally) any extra columns
 * to denormalize onto each history row or ignore from diffs.
 */
abstract class BaseHistoryObserver
{
    /** Bookkeeping columns with no audit signal, on top of any subclass adds. */
    protected array $ignoredColumns = ['updated_at'];

    abstract protected function historyModelClass(): string;

    /** Column name on the history table that points back at the parent row. */
    abstract protected function parentKeyColumn(): string;

    /** Extra columns to copy onto every history row, e.g. denormalized lookup keys. */
    protected function extraColumns(Model $model): array
    {
        return [];
    }

    public function created(Model $model): void
    {
        $attributes = $this->filtered($model->getAttributes());
        $this->record($model, 'created', null, $attributes);
    }

    public function updated(Model $model): void
    {
        $changes = collect($model->getChanges())->except($this->ignoredColumns);
        if ($changes->isEmpty()) {
            return;
        }

        $original = $changes->keys()
            ->mapWithKeys(fn($col) => [$col => $model->getOriginal($col)]);

        $this->record($model, 'updated', $original->toArray(), $changes->toArray());
    }

    public function deleted(Model $model): void
    {
        $attributes = $this->filtered($model->getAttributes());
        $this->record($model, 'deleted', $attributes, null);
    }

    protected function filtered(array $attrs): array
    {
        return collect($attrs)->except($this->ignoredColumns)->toArray();
    }

    protected function record(Model $model, string $type, ?array $old, ?array $new): void
    {
        $historyModel = $this->historyModelClass();

        $historyModel::create(array_merge([
            $this->parentKeyColumn() => $model->getKey(),
            'changed_by'             => auth()->id(),
            'change_type'            => $type,
            'changed_columns'        => array_keys($new ?? $old ?? []),
            'old_values'             => $old,
            'new_values'             => $new,
        ], $this->extraColumns($model)));
    }
}
