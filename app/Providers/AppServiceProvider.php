<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use App\Models\LoadingPlanEntry;
use App\Models\LotQuantity;
use App\Observers\LoadingPlanEntryObserver;
use App\Observers\LotQuantityObserver;
use Illuminate\Support\Facades\DB;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // $this->app->singleton(\App\Services\LotScheduleCalculator::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $default = config('database.default');
        $host = config("database.connections.{$default}.host");
        $isLocal = $default === 'sqlite' || in_array($host, ['127.0.0.1', 'localhost', '::1'], true);

        DB::prohibitDestructiveCommands(! $isLocal && getenv('ALLOW_DESTRUCTIVE_DB_COMMANDS') !== 'yes');

        Inertia::share([
            'appName' => env('APP_NAME', ''),
        ]);
        Vite::prefetch(concurrency: 3);
        \App\Models\Lot::observe(\App\Observers\LotObserver::class);
        LoadingPlanEntry::observe(LoadingPlanEntryObserver::class);
        LotQuantity::observe(LotQuantityObserver::class);
    }
}
