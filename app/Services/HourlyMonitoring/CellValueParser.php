<?php

namespace App\Services\HourlyMonitoring;

use App\Models\DowntimeCode;

/**
 * Cell semantics: a cell is either an integer (output) or a downtime code.
 * Blank clears the cell. Code matching is case-insensitive and whitespace-tolerant.
 */
class CellValueParser
{
    /** @var array<string, DowntimeCode>|null */
    private ?array $codes = null;

    /**
     * @return array{qty: ?int, code_id: ?int}|null  null = invalid; both null = clear the cell
     */
    public function parse(?string $raw): ?array
    {
        $value = trim((string) preg_replace('/\s+/u', ' ', (string) $raw));

        if ($value === '') {
            return ['qty' => null, 'code_id' => null];
        }

        if (preg_match('/^\d{1,3}(,\d{3})+$/', $value)) { // pasted "1,500"
            $value = str_replace(',', '', $value);
        }

        if (preg_match('/^\d{1,12}$/', $value)) {
            return ['qty' => (int) $value, 'code_id' => null];
        }

        $code = $this->codes()[mb_strtoupper($value)] ?? null;

        return $code ? ['qty' => null, 'code_id' => $code->id] : null;
    }

    /** @return array<string, DowntimeCode> */
    private function codes(): array
    {
        return $this->codes ??= DowntimeCode::all()
            ->keyBy(fn (DowntimeCode $c) => mb_strtoupper($c->code))
            ->all();
    }
}
