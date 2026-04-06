<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Constants\WipConstants;
use App\Models\PickUp;
use App\Traits\MassDeletesByIds;
use Inertia\Inertia;
use App\Services\PickupService;
use App\Traits\ParseRequestTrait;
use Illuminate\Support\Facades\Storage;

class PickupController extends Controller
{
  use ParseRequestTrait;

  protected $pickupService;

  public function __construct(
    PickupService $pickupService,
  ) {
    $this->pickupService = $pickupService;
  }

  private const SEARCHABLE_COLUMNS = [
    'PARTNAME',
    'PACKAGE',
    'LOTID',
  ];

  use MassDeletesByIds;
  public function massGenocide(Request $request)
  {
    return $this->massDeleteByIds(
      $request,
      PickUp::class
    );
  }

  private function validateChartStatus(string $status): bool
  {
    return in_array($status, WipConstants::SUMMARY_CATEGORY_FILTER);
  }

  public function index(Request $request)
  {
    $search = $request->input('search', '');
    $perPage = $request->input('perPage', 100);
    $totalEntries = PickUp::count();

    $partNames = PickUp::query()
      ->selectRaw("*, id_pickup as id")
      ->when($search, function ($query, $search) {
        $query->where(function ($q) use ($search) {
          foreach (self::SEARCHABLE_COLUMNS as $column) {
            $q->orWhere($column, 'like', "%{$search}%");
          }
        });
      })
      ->orderBy('DATE_CREATED', 'DESC')
      ->paginate($perPage)
      ->withQueryString();

    return Inertia::render('PickupList', [
      'pickups' => $partNames,
      'search' => $search,
      'perPage' => $perPage,
      'totalEntries' => $totalEntries,
    ]);
  }

  public function getOverallPickUp(Request $request)
  {
    $dates = $this->parseDateRangeFromRequest($request);
    return $this->pickupService->getOverallPickUp($dates['start'], $dates['end']);
  }
  public function getPackagePickUpSummary(Request $request)
  {
    $dates = $this->parseDateRangeFromRequest($request);
    $chartStatus = $request->input('chartStatus', 'all') ?? 'all';

    if (!$this->validateChartStatus($chartStatus)) {
      return response()->json([
        'status' => 'error',
        'message' => 'Invalid chart status: ' . $chartStatus,
      ], 400);
    }

    return $this->pickupService->getPackagePickUpSummary($chartStatus, $dates['start'], $dates['end']);
  }

  public function getPackagePickUpTrend(Request $request)
  {
    $packageName = $this->parsePackageName($request);
    $periodParams = $this->parsePeriodParams($request);
    $workweekParams = $this->parseWorkweek($request);

    return $this->pickupService->getPackagePickUpTrend(
      $packageName,
      $periodParams['period'],
      $periodParams['startDate'],
      $periodParams['endDate'],
      $workweekParams['workweek']
    );
  }
  public function getPickUpTrendRawData(Request $request)
  {

    $packageName = $this->parsePackageName($request);
    $periodParams = $this->parsePeriodParams($request);
    return $this->pickupService->downloadPickUpRawXlsx(
      $packageName,
      $periodParams['startDate'],
      $periodParams['endDate'],
    );
  }
  public function downloadPickUpTemplate()
  {
    $headers = ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    $relativePath = 'excels/pickup_template.xlsx';

    if (!Storage::disk('public')->exists($relativePath)) {
      return response()->json(['error' => 'Template file not found.'], 404);
    }

    $filename = "pickup_template_" . now()->format('Ymd_His_u') . ".xlsx";

    if (ob_get_level()) {
      ob_end_clean();
    }

    return response()->download(Storage::disk('public')->path($relativePath), $filename, $headers);
  }

  public function downloadF3PickUpTemplate()
  {
    $headers = ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    $relativePath = 'excels/f3_pickup_template.xlsx';

    if (!Storage::disk('public')->exists($relativePath)) {
      return response()->json(['error' => 'Template file not found.'], 404);
    }

    $filename = "f3_pickup_template_" . now()->format('Ymd_His_u') . ".xlsx";

    if (ob_get_level()) {
      ob_end_clean();
    }

    return response()->download(Storage::disk('public')->path($relativePath), $filename, $headers);
  }
}
