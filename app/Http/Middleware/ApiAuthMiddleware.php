<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiAuthMiddleware
{
  protected $sessionTimeOutMessage = 'You are either not logged in, or your session has expired. Please log in again.';

  public function handle(Request $request, Closure $next): Response
  {
    $emp = session('emp_data');

    if (!$emp || empty($emp['emp_id'])) {
      return response()->json([
        'error'   => 'Unauthenticated',
        'message' => $this->sessionTimeOutMessage,
      ], 401);
    }

    $request->attributes->set('emp_id', $emp['emp_id']);
    $request->attributes->set('role', strtolower(trim($emp['emp_jobtitle'] ?? '')));

    return $next($request);
  }
}
