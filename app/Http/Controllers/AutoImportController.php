<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\ImportService;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Throwable;

class AutoImportController extends Controller
{
    protected ImportService $importService;

    public function __construct(ImportService $importService)
    {
        $this->importService = $importService;
    }

    public function renderF1F2ImportPage()
    {
        return Inertia::render('Import/F1F2ImportPage');
    }

    public function renderF3ImportPage()
    {
        return Inertia::render('Import/F3ImportPage');
    }

    public function renderPickUpImportPage()
    {
        return Inertia::render('Import/F1F2PickUpImportPage');
    }

    public function renderF3PickUpImportPage()
    {
        return Inertia::render('Import/F3PickUpImportPage');
    }

    public function ftpRootImportWIP(Request $request)
    {
        $empId = $request->get('emp_id');

        try {
            $result = $this->importService->ftpRootImportF1F2WIP($empId);

            return response()->json([
                'status' => $result['status'] ?? 'success',
                'message' => $result['message'] ?? 'Import completed',
                'data' => $result['data'] ?? [],
                'total' => $result['total'] ?? [],
            ]);
        } catch (Throwable $e) {
            return $this->importFailed('F1F2 WIP FTP root import failed', $empId, $e);
        }
    }

    public function ftpRootImportOUTS(Request $request)
    {
        $empId = $request->get('emp_id');

        try {
            $result = $this->importService->ftpRootImportF1F2OUT($empId);

            return response()->json([
                'status' => $result['status'] ?? 'success',
                'message' => $result['message'] ?? 'Import completed',
                'data' => $result['data'] ?? [],
                'total' => $result['total'] ?? [],
            ]);
        } catch (Throwable $e) {
            return $this->importFailed('F1F2 OUTS FTP root import failed', $empId, $e);
        }
    }

    public function manualImportWIP(Request $request)
    {
        $empId = $request->get('emp_id');

        // Validation stays outside the try so Laravel returns its normal 422.
        $request->validate([
            'file' => 'required|file|mimes:csv|max:50000',
            'import_date' => 'nullable|date',
        ]);
        $file = $request->file('file');

        try {
            $importDate = $request->get('import_date', now()->toDateString());
            $result = $this->importService->importF1F2WIP($empId, $file, importDate: $importDate);

            return response()->json([
                'status' => $result['status'] ?? 'success',
                'message' => $result['message'] ?? 'Import completed',
                'data' => $result['data'] ?? [],
                'total' => $result['total'] ?? [],
            ]);
        } catch (Throwable $e) {
            return $this->importFailed('F1F2 WIP manual import failed', $empId, $e);
        }
    }

    public function manualImportOUTS(Request $request)
    {
        $empId = $request->get('emp_id');

        $request->validate([
            'file' => 'required|file|mimes:csv|max:50000',
            'import_date' => 'nullable|date',
        ]);
        $file = $request->file('file');

        try {
            $importDate = $request->get('import_date', now()->toDateString());
            $result = $this->importService->importF1F2OUT($empId, $file, importDate: $importDate);

            return response()->json([
                'status' => $result['status'] ?? 'success',
                'message' => $result['message'] ?? 'Import completed',
                'data' => $result['data'] ?? [],
                'total' => $result['total'] ?? [],
            ]);
        } catch (Throwable $e) {
            return $this->importFailed('F1F2 OUTS manual import failed', $empId, $e);
        }
    }

    public function importCapacity(Request $request)
    {
        $empId = $request->get('emp_id');

        $request->validate([
            'file' => 'required|file|mimes:xlsx|max:10240',
        ]);

        $file = $request->file('file');

        try {
            $result = $this->importService->importCapacity($empId, $file);

            return response()->json([
                'status' => $result['status'] ?? 'success',
                'message' => $result['message'] ?? 'Import completed',
                'data' => $result['data'] ?? [],
                'updated' => $result['updated'] ?? [],
                'created' => $result['created'] ?? [],
                'total' => $result['total'] ?? [],
            ]);
        } catch (Throwable $e) {
            return $this->importFailed('Capacity import failed', $empId, $e);
        }
    }

    public function importPickUp(Request $request)
    {
        $empId = $request->get('emp_id');
        $isAllowDuplicate = filter_var($request->input('isAllowDuplicate', false), FILTER_VALIDATE_BOOLEAN);

        $request->validate([
            'file' => 'required|file|mimes:xlsx|max:10240',
        ]);

        $file = $request->file('file');

        try {
            $result = $this->importService->importF1F2PickUp($empId, $file, $isAllowDuplicate);

            return response()->json([
                'status' => $result['status'] ?? 'success',
                'message' => $result['message'] ?? 'Import completed',
                'data' => $result['data'] ?? [],
            ], ($result['status'] ?? 'success') === 'success' ? 200 : 422);
        } catch (Throwable $e) {
            return $this->importFailed('F1F2 pick-up import failed', $empId, $e);
        }
    }

    public function importF3PickUp(Request $request)
    {
        $empId = $request->get('emp_id');
        $isAllowDuplicate = filter_var($request->input('isAllowDuplicate', false), FILTER_VALIDATE_BOOLEAN);

        $request->validate([
            'file' => 'required|file|mimes:xlsx|max:10240',
        ]);

        $file = $request->file('file');

        try {
            $result = $this->importService->importF3PickUp($empId, $file, $isAllowDuplicate);

            return response()->json([
                'status' => $result['status'] ?? 'success',
                'message' => $result['message'] ?? 'Import completed',
                'data' => $result['data'] ?? [],
            ], ($result['status'] ?? 'success') === 'success' ? 200 : 422);
        } catch (Throwable $e) {
            return $this->importFailed('F3 pick-up import failed', $empId, $e);
        }
    }

    public function importF3(Request $request)
    {
        $empId = $request->get('emp_id');

        $request->validate([
            'file' => 'required|file|mimes:xlsx|max:10240',
            'import_date' => 'nullable|date',
        ]);
        $file = $request->file('file');

        try {
            $importDate = $request->get('import_date', now()->toDateString());
            $result = $this->importService->importF3($empId, $file, $importDate);

            return response()->json([
                'status' => $result['status'] ?? 'success',
                'message' => $result['message'] ?? 'Import completed',
                'data' => $result['data'] ?? [],
            ]);
        } catch (Throwable $e) {
            return $this->importFailed('F3 import failed', $empId, $e);
        }
    }

    /**
     * Log the failure and return a consistent 500 JSON response.
     */
    private function importFailed(string $context, mixed $empId, Throwable $e): JsonResponse
    {
        Log::error($context, [
            'emp_id'  => $empId,
            'message' => $e->getMessage(),
            'file'    => $e->getFile(),
            'line'    => $e->getLine(),
            'trace'   => $e->getTraceAsString(),
        ]);

        return response()->json([
            'status'  => 'error',
            'message' => 'Import failed: ' . $e->getMessage(),
        ], 500);
    }
}
