<?php

use App\Http\Controllers\LoginController;
use App\Http\Middleware\SessionMiddleware;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

$app_name = env('APP_NAME', '');

Route::withoutMiddleware([SessionMiddleware::class])->group(function () {
  Route::get('/login', [LoginController::class, 'show'])->name('login');
  Route::post('/login', [LoginController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('login.store');
  Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');
});

Route::prefix($app_name)->withoutMiddleware([SessionMiddleware::class])->group(function () {
  Route::get('/unauthorized', function () {
    return Inertia::render('Unauthorized');
  })->name('unauthorized');
});
