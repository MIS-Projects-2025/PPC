<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Inertia::share([
            'appName' => env('APP_NAME', ''),
        ]);
        Vite::prefetch(concurrency: 3);
        \App\Models\Lot::observe(\App\Observers\LotObserver::class);
    }
}
