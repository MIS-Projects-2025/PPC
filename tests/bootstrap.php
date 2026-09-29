<?php

/*
 * PHPUnit bootstrap. Runs before Laravel boots and before any test, so before
 * RefreshDatabase can drop a single table.
 *
 * It trusts ONLY what phpunit.xml injected (<env ... force="true"/>) and
 * refuses to start unless that points at a throwaway LOCAL database. It is
 * deliberately strict: if it ever blocks you wrongly, fix phpunit.xml — do
 * not loosen this file.
 */

require __DIR__ . '/../vendor/autoload.php';

$safeHosts = ['127.0.0.1', 'localhost', '::1'];
$safeDatabaseName = '/_test(ing)?$/';

$read = static function (string $key): ?string {
    $value = $_SERVER[$key] ?? $_ENV[$key] ?? getenv($key);

    return ($value === false || $value === null || $value === '') ? null : (string) $value;
};

$abort = static function (string $reason): never {
    fwrite(
        STDERR,
        PHP_EOL . '  REFUSING TO RUN TESTS: ' . $reason . PHP_EOL
            . '  Nothing was touched. Fix phpunit.xml (forced local test values) and run again.' . PHP_EOL . PHP_EOL
    );

    exit(1);
};

$check = static function (string $label, ?string $driver, ?string $host, ?string $database) use ($safeHosts, $safeDatabaseName, $abort): void {
    if ($driver === null || $database === null) {
        $abort("{$label}: phpunit.xml must set the driver and database explicitly, with force=\"true\", so a stray .env can never supply them.");
    }

    if ($driver === 'sqlite') {
        if ($database !== ':memory:') {
            $abort("{$label}: sqlite must use ':memory:' while testing, got '{$database}'.");
        }

        return;
    }

    if ($host === null || ! in_array($host, $safeHosts, true)) {
        $abort("{$label}: host '" . ($host ?? 'unset') . "' is not local. Tests may only run against " . implode(', ', $safeHosts) . '.');
    }

    if (! preg_match($safeDatabaseName, $database)) {
        $abort("{$label}: database '{$database}' must end in _test or _testing.");
    }
};

if ($read('APP_ENV') !== 'testing') {
    $abort("APP_ENV is '" . ($read('APP_ENV') ?? 'unset') . "', expected 'testing'.");
}

foreach (['DB_URL', 'DATABASE_URL', 'QDN_DB_URL'] as $urlKey) {
    if ($read($urlKey) !== null) {
        $abort("{$urlKey} is set. A connection URL overrides host/database, so it is not allowed while testing.");
    }
}

$check('default connection', $read('DB_CONNECTION'), $read('DB_HOST'), $read('DB_DATABASE'));
$check('qdn_db connection', $read('QDN_DB_CONNECTION'), $read('QDN_DB_HOST'), $read('QDN_DB_DATABASE'));
