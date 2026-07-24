<?php

namespace App\Http\Controllers;

use App\Models\PartName;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;
use App\Services\BulkUpserter;

class PartNameController extends Controller
{
    private const SEARCHABLE_COLUMNS = [
        'devicename',
        'focus_grp',
        'areas',
        'productline',
        'package_type',
        'lead_count',
        'dimensions',
        'allocation',
        'generic_name',
        'drypack',
        'created_by',
    ];

    private function rules($id = null): array
    {
        return [
            'devicename' => [
                'required',
                'string',
                'max:45',
                Rule::unique('qdn_db.package_list', 'devicename')->ignore($id),
            ],
            'focus_grp' => 'required|string|max:95',
            'areas' => 'required|string|max:45',
            'productline' => 'required|in:PL1,PL6',
            'package_type' => 'required|string|max:45',
            'lead_count' => 'required|string|max:45',
            'dimensions' => 'required|string|max:45',
            'allocation' => 'nullable|string|max:95',
            'generic_name' => 'nullable|string|max:45',
            'drypack' => 'nullable|string|max:45',
            'recipe' => 'nullable|integer',
        ];
    }

    private function validateParts(Request $request, $id = null): array
    {
        $data = $request->all();

        if (isset($data[0]) && is_array($data[0])) {
            return $request->validate([
                '*.devicename' => 'required|string|max:45', // see note below re: bulk unique
                '*.focus_grp' => 'required|string|max:95',
                '*.areas' => 'required|string|max:45',
                '*.productline' => 'required|in:PL1,PL6',
                '*.package_type' => 'required|string|max:45',
                '*.lead_count' => 'required|string|max:45',
                '*.dimensions' => 'required|string|max:45',
                '*.allocation' => 'nullable|string|max:95',
                '*.generic_name' => 'nullable|string|max:45',
                '*.drypack' => 'nullable|string|max:45',
                '*.recipe' => 'nullable|integer',
            ]);
        }

        return $request->validate($this->rules($id));
    }

    private function checkDuplicateDevicenames(array $records): array
    {
        $errors = [];
        $devicenames = array_map(fn($r) => $r['devicename'] ?? null, $records);

        // 1. Duplicates WITHIN the submitted batch itself
        $seen = [];
        foreach ($devicenames as $index => $name) {
            if ($name === null) continue;

            if (isset($seen[$name])) {
                $errors[] = "Row " . ($index + 1) . ": devicename '{$name}' is duplicated within this batch (also on row " . ($seen[$name] + 1) . ").";
            } else {
                $seen[$name] = $index;
            }
        }

        // 2. Duplicates against what's ALREADY in the DB
        $existing = PartName::whereIn('devicename', array_filter($devicenames))
            ->pluck('devicename')
            ->toArray();

        foreach ($devicenames as $index => $name) {
            if ($name !== null && in_array($name, $existing)) {
                $errors[] = "Row " . ($index + 1) . ": devicename '{$name}' already exists.";
            }
        }

        return $errors;
    }

    public function store(Request $request)
    {
        $user = session('emp_data');
        $addedBy = $user['emp_id'] ?? null;

        $validated = $this->validateParts($request);

        $records = isset($validated[0]) ? $validated : [$validated];

        // Check for duplicates BEFORE inserting anything
        $duplicateErrors = $this->checkDuplicateDevicenames($records);

        if (!empty($duplicateErrors)) {
            return response()->json([
                'status' => 'error',
                'message' => 'You have ' . count($duplicateErrors) . ' error/s',
                'data' => $duplicateErrors,
            ], 422);
        }

        $records = array_map(function ($part) use ($addedBy) {
            return array_merge($part, [
                'created_by' => $addedBy,
            ]);
        }, $records);

        try {
            PartName::insert($records);
        } catch (\Illuminate\Database\QueryException $e) {
            // safety net in case of a race condition between check and insert
            return response()->json([
                'status' => 'error',
                'message' => 'One or more devicenames already exist.',
            ], 422);
        }

        return response()->json([
            'message' => 'Part(s) added successfully',
            'data' => $records,
        ]);
    }

    public function update(Request $request, $id)
    {
        $part = PartName::findOrFail($id);

        $validated = $this->validateParts($request, $id); // pass $id so unique rule ignores itself
        $part->update($validated);

        return response()->json([
            'message' => 'Part updated successfully',
            'data' => $part,
        ]);
    }


    public function upsert($id = null)
    {
        $part = $id ? PartName::findOrFail($id) : null;

        return Inertia::render('PartNameUpsert', [
            'part' => $part,
        ]);
    }

    public function insertMany(Request $request)
    {
        $parts = $request->input('parts', []);

        $parts = array_map(function ($p) {
            return [
                'devicename' => $p['devicename'] ?? '',
                'focus_grp' => $p['focus_grp'] ?? '',
                'areas' => $p['areas'] ?? '',
                'productline' => $p['productline'] ?? 'PL1',
                'package_type' => $p['package_type'] ?? '',
                'lead_count' => $p['lead_count'] ?? '',
                'dimensions' => $p['dimensions'] ?? '',
            ];
        }, $parts);

        return Inertia::render('PartNameMultiUpsert', [
            'parts' => $parts,
        ]);
    }

    public function bulkUpdate(Request $request)
    {
        $rows = $request->all();
        $user = session('emp_data');
        $model = new PartName();
        $table = $model->getConnectionName() . '.' . $model->getTable();

        $columnRules = [
            'focus_grp' => 'nullable',
            'areas' => 'required|string',
            'productline' => 'nullable',
            'devicename' => function ($id, $fields) use ($table) {
                return Rule::unique($table, 'devicename')->ignore($id);
            },
            'package_type' => 'nullable',
            'lead_count' => 'nullable',
            'dimensions' => 'nullable',
            'allocation' => 'nullable',
            'generic_name' => 'nullable',
            'drypack' => 'nullable',
            'recipe' => 'nullable|integer',
        ];

        $rows = array_map(function ($row) use ($user) {
            $row['created_by'] = $user['emp_id'] ?? null;
            return $row;
        }, $rows);

        $bulkUpdater = new BulkUpserter(new PartName(), $columnRules, [], []);

        $result = $bulkUpdater->update($rows);

        if (!empty($result['errors'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'You have ' . count($result['errors']) . ' error/s',
                'data' => $result['errors']
            ], 422);
        }

        return response()->json([
            'status' => 'ok',
            'message' => 'Updated successfully',
            'updated' => $result['updated']
        ]);
    }

    public function destroy($id)
    {
        $part = PartName::findOrFail($id);
        $part->delete();

        return response()->json([
            'success' => true,
            'message' => 'Part deleted successfully',
        ]);
    }

    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $perPage = $request->input('perPage', 10);
        $totalEntries = PartName::count();

        $partNames = PartName::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    foreach (self::SEARCHABLE_COLUMNS as $column) {
                        $q->orWhere($column, 'like', "%{$search}%");
                    }
                });
            })
            ->orderBy('devicename')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('PartNameList', [
            'partNames' => $partNames,
            'search' => $search,
            'perPage' => $perPage,
            'totalEntries' => $totalEntries,
        ]);
    }
}
