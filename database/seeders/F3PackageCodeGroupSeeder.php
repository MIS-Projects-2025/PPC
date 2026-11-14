<?php

namespace Database\Seeders;

use App\Models\F3PackageCodeGroup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class F3PackageCodeGroupSeeder extends Seeder
{
    private const SOURCE = __DIR__ . '/data/f3_package_codes.tsv';

    public function run(): void
    {
        $source = $this->readSource();

        $existing = [];
        foreach (F3PackageCodeGroup::query()->get(['package_code', 'package_type']) as $r) {
            $existing[$this->key($r->package_code, $r->package_type)] = true;
        }

        $now = now();
        $missing = [];
        foreach ($source as $key => [$code, $type]) {
            if (! isset($existing[$key])) {
                $missing[] = [
                    'package_code' => $code,
                    'package_type' => $type,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ];
            }
        }

        DB::transaction(function () use ($missing) {
            foreach (array_chunk($missing, 500) as $chunk) {
                F3PackageCodeGroup::insert($chunk);
            }
        });

        // insert() bypasses model events, so the saved() hook never busts the cache.
        Cache::forget(F3PackageCodeGroup::CACHE_KEY);

        $this->command?->info(sprintf(
            'F3 package codes: %d in source, %d inserted, %d already present.',
            count($source),
            count($missing),
            count($source) - count($missing)
        ));
    }

    /** @return array<string, array{0:string,1:string}> keyed by normalized (code, type) */
    private function readSource(): array
    {
        if (! is_readable(self::SOURCE)) {
            throw new \RuntimeException('Seed file not found: ' . self::SOURCE);
        }

        $rows = [];
        foreach (file(self::SOURCE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $i => $line) {
            if ($i === 0) {
                $line = preg_replace('/^\xEF\xBB\xBF/', '', $line); // Excel BOM
            }

            $cols = explode("\t", $line);
            if (count($cols) < 2) {
                continue;
            }

            $code = strtoupper(trim($cols[0]));   // matches lookup() normalization
            $type = trim($cols[1]);

            // header row + the stray "Lead_Count / PACKAGE" row mid-file
            if ($code === '' || $type === '' || in_array($code, ['PKG CODE', 'LEAD_COUNT'], true)) {
                continue;
            }

            $rows[$this->key($code, $type)] = [$code, $type];
        }

        return $rows;
    }

    private function key(string $code, string $type): string
    {
        return strtoupper(trim($code)) . "\t" . trim($type);
    }
}
