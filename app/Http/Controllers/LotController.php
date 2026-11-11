<?php

namespace App\Http\Controllers;

use App\Models\Lot;
use App\Models\ProductionLine;
use App\Models\RackPage;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\LotService;
use App\Repositories\Interfaces\LotRepositoryInterface;
use App\Repositories\Interfaces\RackRepositoryInterface;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;
use App\Repositories\Interfaces\LotPositionRepositoryInterface;
use App\Repositories\Interfaces\LotRunRepositoryInterface;
use Illuminate\Support\Facades\Log;
use App\Models\BoxDimension;
use App\Models\PlacementRecommendation;
use App\Services\RecommendationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use App\Services\RackFloorMapService;

class LotController extends Controller
{
    public function __construct(
        protected LotService              $lotService,
        protected LotRepositoryInterface  $lotRepo,
        protected LotPositionRepositoryInterface  $lotPositionRepo,
        protected RackRepositoryInterface $rackRepo,
        protected RackSlotRepositoryInterface $rackSlotRepo,
        protected LotRunRepositoryInterface $lotRunRepo,
    ) {}

    public function receive(): Response
    {
        return Inertia::render('Lots/Receive', [
            'todayLots' => $this->lotRepo->today(),
            'racks'     => $this->rackRepo->all(),
        ]);
    }

    public function all()
    {
        return $this->lotRepo->all();
    }

    // {productionLine} route segment now resolves a rack_pages.key
    // (PL1 / PL6 / RESCON), not a production_lines.name. Kept the param name
    // to avoid touching the route file / frontend links.
    public function index(string $productionLine, RecommendationService $recommendations): Response
    {
        $page = RackPage::where('key', strtoupper($productionLine))
            ->firstOrFail();

        $filters = request()->only([
            'status',
            'search',
            'date',
            'received_date_from',
            'received_date_to',
            'released_date_from',
            'released_date_to',
            'aging',
            'unslotted',
            'per_page',
            'sort',
            'restocked',
        ]);

        $todayStart = now('Asia/Manila')->startOfDay()->utc();
        $todayEnd   = now('Asia/Manila')->endOfDay()->utc();

        return Inertia::render('LotsUpstream', [
            'lots' => Inertia::always(function () use ($filters, $page) {
                $lots = $this->lotRepo->paginate($filters, $page->id);

                // Separate data source (different DB schema, may be
                // unavailable) — attach AFTER pagination, never inside the
                // main lots query, so a failure here can't affect $lots.
                $lotIds = collect($lots->items())->pluck('lot_id')->all();
                $runs   = $this->lotRunRepo->latestForLots($lotIds);

                foreach ($lots->items() as $lot) {
                    $lot->setAttribute(
                        'latest_run',
                        $runs->get(\Illuminate\Support\Str::lower($lot->lot_id))
                    );
                }

                return $lots;
            }),
            'racks' => fn() => $this->rackRepo->getAllByRackPage($page->id),
            'occupancy' => fn() => $this->lotPositionRepo->getOccupancyByRackPage($page->id),
            'filters' => $filters,
            'dimensions' => fn() => BoxDimension::orderBy('length')->orderBy('height')->get(),
            'productionLine' => $page->key,
            'productionLineId' => $page->id,
            'recommendationsVisible' => fn() => $recommendations->isVisible($page->id),
            'totalEntries' => Lot::whereHas(
                'positions',
                fn($q) => $q->where('rack_page_id', $page->id)
            )->count(),
            'totalReleased' => Lot::whereHas(
                'stagings',
                fn($q) => $q
                    ->whereBetween('released_at', [$todayStart, $todayEnd])
            )
                ->whereHas('stagings.positions', fn($q) => $q->where('rack_page_id', $page->id))
                ->count(),
            'totalReceived' => Lot::whereHas('positions', fn($q) => $q->where('rack_page_id', $page->id))
                ->whereBetween('received_at', [$todayStart, $todayEnd])
                ->count(),
            'floorMaps' => app(RackFloorMapService::class)->forPages(RackPage::orderBy('id')->get()),
        ]);
    }

    // GET /lots/aging
    // Supervisor/WCO view of all lots past the 3-day threshold
    public function aging(): Response
    {
        return Inertia::render('Lots/Aging', [
            'lots' => $this->lotRepo->aging(),
        ]);
    }

    // POST lot-upstream/recommend
    // Advisory and fail-open: any problem answers 200 with no slots, never an error the UI would show.
    public function recommend(RecommendationService $recommendations)
    {
        $validator = Validator::make(request()->all(), [
            'lot_id'       => 'required|string|max:50',
            'partname'     => 'nullable|string|max:255',
            'qty'          => 'nullable|integer|min:1|max:9999999', // accepted, not used by the engine
            'box_count'    => 'nullable|integer|min:1|max:999',
            'dimension_id' => 'nullable|integer',
            'rack_page_id' => 'required|integer|exists:rack_pages,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['id' => null, 'slots' => [], 'reason' => 'error', 'prefill' => null]);
        }

        return response()->json($recommendations->forRequest($validator->validated()));
    }

    // POST lot-upstream/recommendation/{id}/didnt-fit
    // The optional tap: the recommended slot was physically full. Slot IDs come from `recommended`.
    public function didntFit(int $id)
    {
        PlacementRecommendation::whereKey($id)
            ->whereNull('didnt_fit_at')
            ->update(['didnt_fit_at' => Carbon::now('UTC')]);

        return response()->json(['status' => 'success']);
    }

    // POST /lots
    // Called when WCO confirms a scan + slot assignment
    public function store()
    {
        $data = request()->validate([
            'lot_id'    => 'required|string|max:50',
            'partname' => 'nullable|string|max:255',
            'qty'       => 'required|integer|min:1|max:9999999',
            'slot_ids'  => 'sometimes|array|min:0',
            'slot_ids.*' => ['sometimes', 'integer', \Illuminate\Validation\Rule::exists('rack_slots', 'id')->whereNull('deleted_at')],
            'recommendation_id' => 'nullable|integer',
            'box_count'    => 'nullable|integer|min:1|max:999', // keep in sync with MAX_BOX_COUNT in useLotActions
            'dimension_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists((new BoxDimension)->getTable(), 'id')],
        ]);

        $data['received_by'] = session('emp_data')['emp_id'] ?? abort(401, 'Session expired. Please log in again.');

        try {
            $result = $this->lotService->receive($data);
        } catch (\Illuminate\Database\QueryException $e) {
            // 1062 = duplicate key: two terminals received the same lot at the same instant
            if (($e->errorInfo[1] ?? null) === 1062) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'lot_id' => 'This lot was just received on another terminal. Refresh and check the list.',
                ]);
            }

            throw $e;
        }

        return response()->json([
            'status'  => 'success',
            'message' => "Lot {$data['lot_id']} received successfully.",
            'data'    => $result,
        ]);
    }

    // POST /lots/{id}/remove
    // Manual removal from rack — outside normal release flow
    // deprecated, not used
    public function remove(int $id)
    {
        request()->validate([
            'reason' => 'required|string|max:500',
        ]);

        $removedBy = session('emp_data')['emp_id'] ?? abort(401, 'Session expired. Please log in again.');

        $this->lotService->remove($id, $removedBy, request('reason'));

        return response()->json([
            'status'  => 'success',
            'message' => 'Lot removed from rack.'
        ]);
    }

    public function release()
    {
        $releasedBy = session('emp_data')['emp_id'] ?? abort(401, 'Session expired. Please log in again.');

        $data = request()->validate([
            'lot_id'    => 'required|string|max:50',
            'partname' => 'nullable|string|max:255',
            'withdrawer_id' => [
                'required',
                'string',
                'max:50',
                // a typo'd badge number would otherwise be written to the audit trail permanently
                // the masterlist isn't reliable enough, I can't enforce it as a hard rule. so commented out.
                // fn($attribute, $value, $fail) => \App\Models\Employee::where('EMPLOYID', $value)->exists()
                //     || $fail('Unknown employee ID. Re-scan the badge.'),
            ],
        ]);

        $releasedLot = $this->lotService->release($data['lot_id'], $data['withdrawer_id'] ?? "", $releasedBy, $data['partname'] ?? null);

        return response()->json([
            'status'  => 'success',
            'message' => 'Lot released to MH.',
            'data'    => $releasedLot

        ]);
    }

    public function update(int $id)
    {
        $userId = session('emp_data')['emp_id'] ?? abort(401, 'Session expired. Please log in again.');

        $data = request()->validate([
            'lot_id'    => 'sometimes|string|max:50', // i can't assume lot_id is unique, so allow it to be updated
            'partname' => 'sometimes|string|max:255',
            'qty'       => 'sometimes|required|integer|min:1|max:9999999',
            'status'    => 'sometimes|string|in:staged,removed,released',
            'slot_ids'  => 'sometimes|array|min:0',
            'slot_ids.*' => ['sometimes', 'integer', \Illuminate\Validation\Rule::exists('rack_slots', 'id')->whereNull('deleted_at')],
        ]);

        // status is owned by receive/release/remove, never by a generic edit
        unset($data['status']);

        // A released lot has no active positions; re-slotting it would create phantom rack occupancy.
        if (Lot::whereKey($id)->toBase()->value('status') === 'released') {
            unset($data['slot_ids']);
        }

        if (array_key_exists('slot_ids', $data) && empty($data['slot_ids'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'slot_ids' => 'A staged lot must keep at least one slot.',
            ]);
        }

        $data['modified_by'] = $userId;

        try {
            $updated = $this->lotRepo->update($id, $data);
        } catch (\Illuminate\Database\QueryException $e) {
            if (($e->errorInfo[1] ?? null) === 1062) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'lot_id' => 'Another staged lot already has this lot ID and part name.',
                ]);
            }

            throw $e;
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Lot updated successfully',
            'data' => $updated,
        ]);
    }

    public function download(string $productionLine)
    {
        $page = RackPage::where('key', strtoupper($productionLine))
            ->firstOrFail();

        $filters = request()->only([
            'status',
            'search',
            'date',
            'received_date_from',
            'received_date_to',
            'released_date_from',
            'released_date_to',
            'aging',
            'unslotted',
            'per_page',
            'sort',
            'restocked',
        ]);

        return $this->lotService->downloadFilteredExport(
            $filters,
            $page->id,
        );
    }
}
