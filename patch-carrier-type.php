<?php

/**
 * Patch: process_travelers.carrier_type drives F3 doable/commit (and the Station label).
 *
 * Run from the app root:
 *   php patch-carrier-type.php             apply
 *   php patch-carrier-type.php --dry-run   check only, write nothing
 *
 * Rules:
 *  - every "find" must match exactly once (spaces/tabs are matched loosely), otherwise NOTHING is written
 *  - a patch whose replacement is already in the file is skipped, so re-running is safe
 *  - CRLF files stay CRLF
 */

declare(strict_types=1);

$dry  = in_array('--dry-run', $argv ?? [], true);
$root = getcwd();

$patches = [

    // ------------------------------------------------------------------
    'app/Models/ProcessTraveler.php' => [
        [
            'note' => 'carrier_type accessor + station label',
            'find' => <<<'EOT'
/** DB stores 'yes'/'no' (varchar(3)); the model exposes a boolean. */
EOT,
            'replace' => <<<'EOT'
/** carrier_type -> what the Station column shows (F3 only). Reel runs through TNR. */
    public const CARRIER_STATION_LABELS = [
        'reel' => 'TNR',
        'tray' => 'TRAY',
        'tube' => 'TUBE',
    ];

    /** carrier_type is stored as reel/tray/tube. The model always exposes it trimmed and lower-cased, or null. */
    protected function carrierType(): Attribute
    {
        return Attribute::make(
            get: fn($v) => ($s = strtolower(trim((string) $v))) === '' ? null : $s,
            set: fn($v) => ($s = strtolower(trim((string) $v))) === '' ? null : $s,
        );
    }

    /** "TNR" for reel, "TRAY" / "TUBE" as is, null when the carrier is empty or unknown. */
    public function carrierStationLabel(): ?string
    {
        $carrier = $this->carrier_type;

        return $carrier === null ? null : (self::CARRIER_STATION_LABELS[$carrier] ?? null);
    }

    /** DB stores 'yes'/'no' (varchar(3)); the model exposes a boolean. */
EOT,
        ],
        [
            'note' => 'toWip(): Station = TNR / TRAY / TUBE',
            'find' => <<<'EOT'
'Ramp_Time'    => $this->input_type,
EOT,
            'replace' => <<<'EOT'
'Ramp_Time'    => $this->input_type,
            'Station'      => $this->carrierStationLabel(),   // F3: TNR (reel) / TRAY / TUBE
EOT,
        ],
        [
            'note' => 'toWip(): keep carrier_type in memory',
            'find' => <<<'EOT'
$w->setAttribute('source', 'f3');
EOT,
            'replace' => <<<'EOT'
$w->setAttribute('source', 'f3');
        $w->setAttribute('carrier_type', $this->carrier_type);
EOT,
        ],
    ],

    // ------------------------------------------------------------------
    'app/Models/CustomerDataWip.php' => [
        [
            'note' => 'carrier_type in-memory accessor',
            'find' => <<<'EOT'
public function getTravelerRemarksAttribute(): ?string
EOT,
            'replace' => <<<'EOT'
public function getCarrierTypeAttribute(): ?string
    {
        return $this->attributes['carrier_type'] ?? null;
    }
    public function getTravelerRemarksAttribute(): ?string
EOT,
        ],
    ],

    // ------------------------------------------------------------------
    'app/Services/RecipeService.php' => [
        [
            'note' => 'forTravelers(): allocation comes from carrier_type, not input_type',
            'find' => <<<'EOT'
$t->input_type,
EOT,
            'replace' => <<<'EOT'
$t->carrier_type ? strtoupper($t->carrier_type) : null,   // reel/tray/tube decides the 95% rule, not input_type
EOT,
        ],
        [
            'note' => 'updateTraveler(): fixed-rate guard reads carrier_type',
            'find' => <<<'EOT'
(clone $q)->value('input_type')
EOT,
            'replace' => <<<'EOT'
(clone $q)->value('carrier_type')
EOT,
        ],
    ],

    // ------------------------------------------------------------------
    'app/Services/LoadingPlanService.php' => [
        [
            'note' => 'createPlannedLot(): F3 doable_recipe_source.allocation from carrier_type',
            'find' => <<<'EOT'
'allocation'  => $wipRow?->Ramp_Time,
EOT,
            'replace' => <<<'EOT'
'allocation'  => $wipRow?->carrier_type ? strtoupper($wipRow->carrier_type) : null,
EOT,
        ],
    ],
];

// ----------------------------------------------------------------------

/** Literal match, except any run of spaces/tabs matches any other run. */
function flexRegex(string $find): string
{
    $parts = preg_split('/[ \t]+/', trim($find));

    return '/' . implode('[ \t]+', array_map(fn($p) => preg_quote($p, '/'), $parts)) . '/';
}

$errors  = 0;
$pending = [];

foreach ($patches as $rel => $list) {
    $path = $root . '/' . $rel;

    if (!is_file($path)) {
        echo "[MISSING] {$rel}\n";
        $errors++;
        continue;
    }

    $raw  = file_get_contents($path);
    $crlf = str_contains($raw, "\r\n");
    $text = $crlf ? str_replace("\r\n", "\n", $raw) : $raw;
    $changed = false;

    foreach ($list as $p) {
        if (str_contains($text, $p['replace'])) {
            echo "[SKIP   ] {$rel}: {$p['note']} (already applied)\n";
            continue;
        }

        $rx = flexRegex($p['find']);
        $n  = preg_match_all($rx, $text);

        if ($n !== 1) {
            echo "[FAIL   ] {$rel}: {$p['note']} (found {$n} matches, expected 1)\n";
            $errors++;
            continue;
        }

        $replacement = $p['replace'];
        $text = preg_replace_callback($rx, fn() => $replacement, $text, 1);
        $changed = true;
        echo "[OK     ] {$rel}: {$p['note']}\n";
    }

    if ($changed) {
        $pending[$path] = $crlf ? str_replace("\n", "\r\n", $text) : $text;
    }
}

if ($errors > 0) {
    echo "\n{$errors} problem(s). Aborted, nothing was written.\n";
    exit(1);
}

if ($dry) {
    echo "\nDry run: " . count($pending) . " file(s) would be changed.\n";
    exit(0);
}

foreach ($pending as $path => $content) {
    file_put_contents($path, $content);
}

echo "\nDone. " . count($pending) . " file(s) changed.\n";
