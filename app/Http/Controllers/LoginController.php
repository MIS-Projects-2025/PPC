<?php

namespace App\Http\Controllers;

use App\Services\EmployeeDirectory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LoginController extends Controller
{
    public function show()
    {
        return Inertia::render('Login');
    }

    public function store(Request $request, EmployeeDirectory $directory)
    {
        $credentials = $request->validate([
            'employeeID' => ['required'],
            'password'   => ['required'],
        ]);

        $employee = $directory->find($credentials['employeeID']);

        if (!$employee || !$directory->passwordMatches($employee, $credentials['password'])) {
            return back()->withErrors(['employeeID' => 'Invalid employee ID or password.']);
        }

        // Refresh the 30-day cache only after a live (masterlist) login
        if (!$employee->from_cache) {
            $directory->remember($employee);
        }

        $request->session()->regenerate();

        session(['emp_data' => [
            'emp_id'        => $employee->EMPLOYID,
            'emp_name'      => $employee->EMPNAME ?? 'NA',
            'emp_firstname' => $employee->FIRSTNAME ?? 'NA',
            'emp_jobtitle'  => $employee->JOB_TITLE ?? 'NA',
            'emp_dept'      => $employee->DEPARTMENT ?? 'NA',
            'emp_prodline'  => $employee->PRODLINE ?? 'NA',
            'emp_station'   => $employee->STATION ?? 'NA',
            'emp_position'  => $employee->EMPPOSITION ?? null,
            'generated_at'  => now(),
        ]]);

        return redirect()->intended(route('dashboard'));
    }

    public function destroy(Request $request)
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
