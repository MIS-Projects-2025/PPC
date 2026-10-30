<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ReadOnlyMode
{
    // Paths that stay reachable when APP_READ_ONLY=true
    private const ALLOWED = [
        'loading-plan/view',
        // add GET data endpoints the page needs, e.g.:
        // 'loading-plan/missing-parts',
        // 'loading-plan/entries/*/history',
    ];

    public function handle(Request $request, Closure $next)
    {
        if (! config('app.read_only')) {
            return $next($request);
        }

        if (! $request->isMethodSafe() || ! $request->is(self::ALLOWED)) {
            abort(404);
        }

        return $next($request);
    }
}