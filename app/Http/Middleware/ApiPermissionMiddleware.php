<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiPermissionMiddleware
{
  public function handle(Request $request, Closure $next, $permission = null): Response
  {
    $emp = session('emp_data');

    if (!$emp) {
      return response()->json([
        'status'  => 'error',
        'error'   => 'Unauthenticated',
        'message' => 'Please log in.',
      ], 401);
    }

    $dept = strtolower($emp['emp_dept'] ?? '');

    if (!in_array($dept, ['ppc', 'mis'], true)) {
      return response()->json([
        'status'  => 'error',
        'error'   => 'Unauthorized',
        'message' => 'You are not authorized to perform this action.',
      ], 403);
    }

    return $next($request);
  }
}
