<?php

namespace Tests\Support;

use RuntimeException;

/**
 * Second layer, behind tests/bootstrap.php. That file checks the env vars
 * phpunit.xml injected; this one checks what Laravel actually RESOLVED after
 * booting, which catches things the env check can't see — a stale
 * bootstrap/cache/config.php (it ignores phpunit's env entirely), a
 * connection URL, split read/write hosts, a .env that won.
 *
 * refreshApplication() runs right after the app boots and BEFORE any test
 * trait (RefreshDatabase, DatabaseTransactions, ...) touches the database.
 *
 * Use it in tests/TestCase.php:   use \Tests\Support\RefusesRealDatabases;
 * (If PHP complains the refreshApplication() declaration is incompatible,
 * add ": void" to match your Laravel version's parent signature.)
 */
trait RefusesRealDatabase
{
    protected function refreshApplication()
    {
        parent::refreshApplication();

        $this->assertDatabaseConfigIsSafe();
    }

    protected function assertDatabaseConfigIsSafe(): void
    {
        $safeHosts = ['127.0.0.1', 'localhost', '::1'];

        if (! $this->app->environment('testing')) {
            throw new RuntimeException(
                "REFUSING TO RUN TESTS: environment is '{$this->app->environment()}', expected 'testing'."
            );
        }

        foreach ($this->connectionsTestsMayTouch() as $name) {
            $config = config("database.connections.{$name}");

            if (! is_array($config)) {
                throw new RuntimeException("REFUSING TO RUN TESTS: connection [{$name}] is not defined.");
            }

            if (! empty($config['url'])) {
                throw new RuntimeException("REFUSING TO RUN TESTS: connection [{$name}] has a url set, which overrides host/database.");
            }

            if (isset($config['read']) || isset($config['write'])) {
                throw new RuntimeException("REFUSING TO RUN TESTS: connection [{$name}] uses split read/write hosts.");
            }

            if (($config['driver'] ?? null) === 'sqlite') {
                if (($config['database'] ?? null) !== ':memory:') {
                    throw new RuntimeException("REFUSING TO RUN TESTS: sqlite connection [{$name}] must be ':memory:'.");
                }

                continue;
            }

            $host = $config['host'] ?? null;
            $database = (string) ($config['database'] ?? '');

            if (! in_array($host, $safeHosts, true)) {
                throw new RuntimeException(
                    "REFUSING TO RUN TESTS: connection [{$name}] host '{$host}' is not local. "
                        . 'If config is cached, run: php artisan config:clear'
                );
            }

            if (! preg_match('/_test(ing)?$/', $database)) {
                throw new RuntimeException(
                    "REFUSING TO RUN TESTS: connection [{$name}] database '{$database}' must end in _test or _testing."
                );
            }
        }
    }

    /** Add any other connection your tests write to. */
    protected function connectionsTestsMayTouch(): array
    {
        return array_values(array_unique([config('database.default'), 'qdn_db']));
    }
}
