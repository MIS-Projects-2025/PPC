<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApiPermissionMiddleware
{
  /**
   * Handle an incoming request.
   *
   * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
   */
  public function handle(Request $request, Closure $next, $permission = null): Response
  {
    // Log::info('permission: ' . $permission);
    // $role = $request->attributes->get('role');
    // $rolesConfig = config('roles');

    // $rolesConfigLower = [];
    // foreach ($rolesConfig as $key => $permissions) {
    //   $rolesConfigLower[strtolower($key)] = array_map('strtolower', $permissions);
    // }

    $token = $request->query('key') ?? $request->bearerToken() ?? session('emp_data.token');
    if (!$token) {
      $redirectUrl = urlencode($request->fullUrl());
      return redirect("http://192.168.20.21:8200/login?redirect={$redirectUrl}");
    }

    Log::info("session('emp_data.token'):" . session('emp_data.token'));
    Log::info("bearer:" . $token);
    Log::info(session()->all());

    $cacheKey = 'authify_user_' . $token;

    $currentUser = cache()->remember($cacheKey, now()->addMinutes(10), function () use ($token) {
      return DB::connection('authify')
        ->table('authify.authify_sessions')
        ->where('token', $token)
        ->first();
    });

    $dept = strtolower($currentUser?->emp_dept ?? '');

    if ($dept !== 'ppc' && $dept !== 'mis') {
      return response()->json([
        'status' => 'error',
        'error' => 'Unauthorized',
        'message' => 'You are not authorized to perform this action.',
      ], 403);
    }

    // Log::info("rolesConfigLower: " . json_encode($rolesConfigLower));
    // Log::info("rolesConfigLower: " . json_encode($rolesConfigLower));
    // Log::info("rolesConfigLower: " . json_encode(!array_key_exists($role, $rolesConfigLower)));
    // if ($permission !== null) {
    //   if (!isset($rolesConfigLower[$role]) || !in_array(strtolower($permission), $rolesConfigLower[$role])) {
    //     return response()->json([
    //       'status' => 'error',
    //       'error' => 'Unauthorized',
    //       'message' => 'You are not authorized to perform this action.',
    //     ], 403);
    //   }
    // }

    return $next($request);
  }
}
