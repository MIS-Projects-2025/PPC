<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUpdateFocusGroupFactoryRequest;
use App\Models\FocusGroupFactory;
use App\Services\FocusGroupFactoryService;
use Illuminate\Http\JsonResponse;

class FocusGroupFactoryController extends Controller
{
    public function __construct(
        protected FocusGroupFactoryService $service
    ) {}

    /**
     * List all focus group to factory mappings.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => FocusGroupFactory::all(),
        ]);
    }

    /**
     * Add a new focus group factory mapping.
     */
    public function store(StoreUpdateFocusGroupFactoryRequest $request): JsonResponse
    {
        $record = FocusGroupFactory::create($request->validated());

        // Invalidate cache so new mappings take effect immediately
        $this->service->clearCache();

        return response()->json([
            'message' => 'Focus group factory created successfully.',
            'data' => $record,
        ], 201);
    }

    /**
     * Show a single mapping.
     */
    public function show(FocusGroupFactory $focusGroupFactory): JsonResponse
    {
        return response()->json([
            'data' => $focusGroupFactory,
        ]);
    }

    /**
     * Update an existing mapping.
     */
    public function update(
        StoreUpdateFocusGroupFactoryRequest $request,
        FocusGroupFactory $focusGroupFactory
    ): JsonResponse {
        $focusGroupFactory->update($request->validated());

        // Invalidate cache
        $this->service->clearCache();

        return response()->json([
            'message' => 'Focus group factory updated successfully.',
            'data' => $focusGroupFactory,
        ]);
    }

    /**
     * Delete a mapping.
     */
    public function destroy(FocusGroupFactory $focusGroupFactory): JsonResponse
    {
        $focusGroupFactory->delete();

        // Invalidate cache
        $this->service->clearCache();

        return response()->json([
            'message' => 'Focus group factory deleted successfully.',
        ]);
    }
}
