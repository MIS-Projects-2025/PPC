<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SessionMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->routeIs('login', 'login.store')) {
            return $next($request);
        }

        $emp = session('emp_data');

        if (!$emp) {
            return $this->redirectToLogin($request);
        }

        $request->attributes->set('auth_user', (object) $emp);
        $request->setUserResolver(fn() => (object) $emp);

        return $next($request);
    }

    private function redirectToLogin(Request $request)
    {
        if ($request->expectsJson() && !$request->header('X-Inertia')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($request->isMethod('GET')) {
            session()->put('url.intended', $request->fullUrl());
        }

        // Inertia needs a full-page location redirect
        return $request->header('X-Inertia')
            ? Inertia::location(route('login'))
            : redirect()->route('login');
    }
}
