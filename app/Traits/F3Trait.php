<?php


namespace App\Traits;

use Illuminate\Support\Facades\DB;
use App\Constants\WipConstants;
use App\Traits\NormalizeStringTrait;
use Illuminate\Support\Facades\Log;
use App\Models\F3;
use App\Helpers\SqlDebugHelper;
use Carbon\Carbon;


trait F3Trait
{
  use NormalizeStringTrait;
  public const PACKAGES_TABLE = "f3_package_names";
  public const RAW_PACKAGES = "f3_raw_packages";
  // private const PPC_TABLE = "ppc_productionline_packagereference";
  private const EXTERNAL_FILE_HEADERS = [
    "f3.running_ct",
    "f3.date_received",
    "f3.packing_list_srf",
    "f3.po_number",
    "f3.machine_number",
    "f3.part_number",
    "f3.package_code",
    'f3_pkg.package_name',
    "raw.raw_package",
    "raw.lead_count",
    "raw.dimension",
    "f3.lot_number",
    "f3.process_req",
    "f3.qty",
    "f3.good",
    "f3.rej",
    "f3.res",
    "f3.date_commit",
    "f3.actual_date_time",
    "f3.status",
    "f3.do_number",
    "f3.remarks",
    "f3.doable",
    "f3.focus_group",
    "f3.gap_analysis",
    "f3.cycle_time",
    "f3.imported_by",
    "f3.date_loaded",
    "f3.modified_at",
    "f3.modified_by",
  ];

  public function getExistingRecords()
  {
    if (!isset($this->table)) {
      throw new \LogicException('The $table property must be defined in the class using this trait.');
    }

    return DB::table($this->table)
      ->select('lot_number', 'date_loaded')
      ->where('date_loaded', '>=', now()->subDays(WipConstants::DAYS_UNTIL_RECLASSIFIED_AS_NEW))
      ->get();
  }

  public function deleteTodayRecords($date = null)
  {
    $date = $date ?? Carbon::today();
    return F3::where('import_date', $date)->delete();
  }

  public function filterByPackageName($query, ?array $packageNames, $column = 'f3_pkg.package_name')
  {
    $query = $this->packageFilterService->applyPackageFilter($query, $packageNames, ["F3"], $column);

    // if (is_string($packageNames)) {
    //   $packageNames = explode(',', $packageNames);
    // }
    // $packageNames = array_filter((array) $packageNames, fn($p) => !empty($p));
    // $aliases = $this->packageGroupRepo->getMembersByPackageName($packageNames, "F3");

    // Log::info("Aliases f3: " . json_encode($aliases));

    // if (!empty($aliases)) {
    //   $query->whereIn($column, $aliases);
    //   // $this->applyNormalizedDimensionFilter($query, $aliases->toArray(), 'raw.dimension');
    //   // ->orWhereIn('raw.dimension', $aliases);

    //   // ->orWhereIn('raw.dimension', $aliases);
    // }

    return $query;
  }

  public function baseF3Query($joinPpc = null, $type = 'wip')
  {
    $query = DB::table($this->table . ' as ' . $this->tableAlias);
    $query->leftJoin(self::RAW_PACKAGES . ' as raw', $this->tableAlias . '.package', '=', 'raw.id');
    $query->leftJoin(self::PACKAGES_TABLE . ' as f3_pkg', 'raw.package_id', '=', 'f3_pkg.id');

    if ($type == 'out') {
      $query->where($this->tableAlias . '.status', 'shipped');
    } else {
      // IQA, For Process, In-process, Hold, FVI, OQA, Boxing, OQA, QA Buy-off
      $query->whereNotIn($this->tableAlias . '.status', ['shipped', 'shipback']);
    }

    if ($joinPpc) {
      if ($joinPpc !== true) {
        $query->where('f3.production_line', $joinPpc);
      }
    }

    return $query;
  }

  public function insertManyF3(array $data)
  {
    F3::insert($data);
  }
}
