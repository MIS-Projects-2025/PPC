<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Services\EmployeeDirectory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function index(EmployeeDirectory $directory)
    {
        $profile = session('emp_data');

        if ($profile) {
            $employee = $directory->find($profile['emp_id']); // live, or cached if masterlist is down

            if ($employee) {
                $profile['EMAIL']     = $employee->EMAIL ?? null;
                $profile['DATEHIRED'] = $employee->DATEHIRED ?? null;
            }
        }

        return Inertia::render('Profile', ['profile' => $profile]);
    }

    public function changePassword(Request $request, EmployeeDirectory $directory)
    {
        $credentials = $request->validate([
            'current_password' => 'required',
            'new_password'     => 'required|confirmed',
        ], [
            'current_password.required' => 'The current password field is required.',
            'new_password.required'     => 'The new password field is required.',
            'new_password.confirmed'    => 'The new password and confirmation do not match.',
        ]);

        $empId = session('emp_data.emp_id');

        try {
            $row = DB::connection('masterlist')
                ->table('employee_masterlist')
                ->select('PASSWRD')
                ->where('EMPLOYID', $empId)
                ->first();

            if (!$row || !hash_equals((string) $row->PASSWRD, $credentials['current_password'])) {
                return back()->withErrors(['current_password' => 'Current password is incorrect.']);
            }

            DB::connection('masterlist')
                ->table('employee_masterlist')
                ->where('EMPLOYID', $empId)
                ->update(['PASSWRD' => $credentials['new_password']]);
        } catch (\Throwable $e) {
            Log::error('Password change failed', ['error' => $e->getMessage()]);
            return back()->withErrors([
                'current_password' => 'Password service is unavailable right now. Please try again later.',
            ]);
        }

        $directory->forget($empId); // next login re-caches the new password

        return back()->with('success', 'Password changed successfully.');
    }
}
