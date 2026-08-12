<?php

namespace App\Services;

use App\Repositories\F1F2WipRepository;
use App\Repositories\F1F2OutRepository;
use App\Services\ExcelValidatorService;
use App\Services\PackageCapacityService;
use App\Repositories\F3RawPackageRepository;
use App\Repositories\PartnameRepository;
use App\Repositories\ImportTraceRepository;
use App\Repositories\PickUpRepository;
use App\Traits\ParseDateTrait;
use App\Constants\WipConstants;
use App\Repositories\F3OutRepository;
use App\Repositories\F3WipRepository;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use PhpOffice\PhpSpreadsheet\Reader\Csv;
use PhpOffice\PhpSpreadsheet\Reader\IReader;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\CellIterator;
use Box\Spout\Reader\Common\Creator\ReaderEntityFactory;
use App\Services\ProductionLineResolver;

class ImportService
{
  use ParseDateTrait;
  protected $csvReader;
  protected $flags = IReader::READ_DATA_ONLY | IReader::IGNORE_ROWS_WITH_NO_CELLS;
  protected $emptyCellFlags = CellIterator::TREAT_EMPTY_STRING_AS_EMPTY_CELL;
  protected string $WIP_QUANTITY_EXCEL_PATH = '\\\\192.168.1.13\\ftproot\\daily_backend_wip.csv';

  // -------------------- for test only --------------------
  // protected string $WIP_QUANTITY_EXCEL_PATH = "C:\\Users\\telford.prog_trainee\\Downloads\\daily_backend_wip.csv";

  protected string $CAPACITY_EXCEL_PATH = "C:\\Users\\telford.prog_trainee\\Downloads\\TSPI Capacity.xlsx";
  protected string $F3_WIP_PATH = "C:\\Users\\telford.prog_trainee\\Downloads\\F3 WIP Sample.xlsx";
  // -------------------- for test only --------------------

  protected string $WIP_OUTS_EXCEL_PATH = "\\\\192.168.1.13\\ftproot\\daily_telford_outs.csv";
  // protected string $WIP_OUTS_EXCEL_PATH = "C:\\Users\\telford.prog_trainee\\Downloads\\daily_telford_outs.csv";
  private const WIP_QUANTITY_LOCK_KEY = 'auto_import_wip_lock';
  private const DAILY_BACKEND_WIP_DATETIME_FORMAT = 'd/m/Y H:i';
  private const WIP_OUTS_LOCK_KEY = 'auto_import_wip_outs_lock';
  private const EXPECTED_DAILY_BACKEND_WIP_COLUMNS = 43;
  private const CHUNK_SIZE = 500;
  private const maximumAlreadyExistsRowCount = 100;
  protected $f1f2WipPlColumnMap = [
    'package'     => 'Package_Name',
    'focus_group' => 'Focus_Group',
    'lead_count'  => 'Lead_Count',
    'part_name'   => 'Part_Name',
  ];
  protected $f1f2OutPlColumnMap = [
    'package'     => 'package',
    'focus_group' => 'focus_group',
    'part_name'   => 'part_name',
  ];

  protected $f3PlColumnMap = [
    'package'     => '_package_name',
    'lead_count'  => '_lead_count',
    'part_name'   => 'part_number',
    'factory_override' => 'F3',
  ];

  protected $sheetToArrayArgs = [
    null,  // nullValue
    true,  // calculateFormulas
    false, // formatData
    false, // returnCellRef
    true,  // preserveEmptyRows
    false, // strictNullComparison
  ];

  public function __construct(
    protected F1F2WipRepository $f1f2WipRepository,
    protected F1F2OutRepository $f1f2WipOutRepository,
    protected PartnameRepository $partnameRepository,
    protected PickUpRepository $pickUpRepository,
    protected F3WipRepository $f3WipRepository,
    protected F3OutRepository $f3OutRepository,
    protected F3RawPackageRepository $f3RawPackageRepository,
    protected ImportTraceRepository $importTraceRepository,
    protected PackageCapacityService $packageCapacityService,
    protected ExcelValidatorService $excelValidator,
    private ProductionLineResolver $resolver
  ) {
    $this->csvReader = new Csv();
  }

  private function insertChunk(
    array $chunk,
    callable $operation,
    int &$successCounter
  ): void {
    if (empty($chunk)) return;

    DB::transaction(fn() => $operation($chunk));

    $successCounter += count($chunk);
  }


  protected function rowFormatterWIP(array $rowData): array
  {
    $rowData['Date_Loaded'] = $this->parseDate($rowData['Date_Loaded'], null);
    $rowData['Start_Time'] = $this->parseDate($rowData['Start_Time'], null);
    $rowData['Reqd_Time'] = $this->parseDate($rowData['Reqd_Time'], null);
    $rowData['Lot_Entry_Time'] = $this->parseDate($rowData['Lot_Entry_Time'], null);
    $rowData['Stage_Start_Time'] = $this->parseDate($rowData['Stage_Start_Time'], null);
    $rowData['CCD'] = $this->parseDate($rowData['CCD'], null);
    $rowData['BE_Starttime'] = $this->parseDate($rowData['BE_Starttime'], null);
    $rowData['Auto_Part'] = strtoupper(trim($rowData['Auto_Part']));
    $rowData['OSL_Days'] = $rowData['OSL_Days'] === '' ? null : (int)$rowData['OSL_Days'];
    $rowData['BE_OSL_Days'] = $rowData['BE_OSL_Days'] === '' ? null : (int)$rowData['BE_OSL_Days'];
    $rowData['Backend_Leadtime'] = $rowData['Backend_Leadtime'] === '' ? null : (int)$rowData['Backend_Leadtime'];
    $rowData['Lead_Count'] = $rowData['Lead_Count'] === '' ? null : (int)$rowData['Lead_Count'];
    $rowData['Bake_Count'] = $rowData['Bake_Count'] === '' ? null : (int)$rowData['Bake_Count'];
    $rowData['Stage_Run_Days'] = $rowData['Stage_Run_Days'] === '' ? null : (int)$rowData['Stage_Run_Days'];
    $rowData['Lot_Entry_Time_Days'] = $rowData['Lot_Entry_Time_Days'] === '' ? null : (int)$rowData['Lot_Entry_Time_Days'];
    $rowData['Qty'] = $rowData['Qty'] === '' ? null : (int)$rowData['Qty'];
    return $rowData;
  }

  protected function rowFormatterOUT(array $rowData): array
  {
    $rowData['date_loaded'] = $this->parseDate($rowData['date_loaded'], null);
    $rowData['package'] = strtoupper((string) ($rowData['package'] ?? ''));
    $rowData['out_date'] = $this->parseDate($rowData['out_date'], null);
    $rowData['test_lot_id'] = (string) ($rowData['test_lot_id'] ?? '');
    $rowData['qty'] = $rowData['qty'] === '' ? null : (int)$rowData['qty'];
    return $rowData;
  }

  public function ftpRootImportF1F2WIP($importedBy = null): array
  {
    date_default_timezone_set('Asia/Manila');
    if (!file_exists($this->WIP_QUANTITY_EXCEL_PATH)) {
      return ['status' => 'error', 'message' => 'CSV file not found or inaccessible.'];
    }

    $tempFile = sys_get_temp_dir() . '\\daily_backend_wip.csv';
    copy($this->WIP_QUANTITY_EXCEL_PATH, $tempFile);

    $reader = ReaderEntityFactory::createCSVReader();
    $reader->open($tempFile);

    return $this->processCsvImport($tempFile, $reader, $importedBy, WipConstants::IMPORT_MANUAL_F1F2_WIP_EXPECTED_HEADERS, $this->f1f2WipRepository, self::WIP_QUANTITY_LOCK_KEY, [$this, 'rowFormatterWIP'], plColumnMap: $this->f1f2WipPlColumnMap);
  }

  public function importF1F2WIP($importedBy = null, $file, $importDate = null, $extension = '.csv')
  {
    date_default_timezone_set('Asia/Manila');
    $path = $file->getPathname();
    $tmpPath = $path . $extension;
    rename($path, $tmpPath);

    $reader = ReaderEntityFactory::createCSVReader();
    $reader->open($tmpPath);

    return $this->processCsvImport($tmpPath, $reader, $importedBy, WipConstants::IMPORT_MANUAL_F1F2_WIP_EXPECTED_HEADERS, $this->f1f2WipRepository, self::WIP_QUANTITY_LOCK_KEY, [$this, 'rowFormatterWIP'], $importDate, plColumnMap: $this->f1f2WipPlColumnMap);
  }

  public function ftpRootImportF1F2OUT($importedBy = null): array
  {
    date_default_timezone_set('Asia/Manila');
    if (!file_exists($this->WIP_OUTS_EXCEL_PATH)) {
      return ['status' => 'error', 'message' => 'CSV file not found or inaccessible.'];
    }

    $tempFile = sys_get_temp_dir() . '\\daily_backend_out.csv';
    copy($this->WIP_OUTS_EXCEL_PATH, $tempFile);

    $reader = ReaderEntityFactory::createCSVReader();
    $reader->open($tempFile);

    return $this->processCsvImport($tempFile, $reader, $importedBy, WipConstants::IMPORT_MANUAL_F1F2_OUT_EXPECTED_HEADERS, $this->f1f2WipOutRepository, self::WIP_OUTS_LOCK_KEY, [$this, 'rowFormatterOUT'], plColumnMap: $this->f1f2OutPlColumnMap);
  }


  public function importF1F2OUT($importedBy = null, $file, $importDate = null, $extension = '.csv')
  {
    date_default_timezone_set('Asia/Manila');
    $path = $file->getPathname();
    $tmpPath = $path . $extension;
    rename($path, $tmpPath);

    $reader = ReaderEntityFactory::createCSVReader();
    $reader->open($tmpPath);

    return $this->processCsvImport($tmpPath, $reader, $importedBy, WipConstants::IMPORT_MANUAL_F1F2_OUT_EXPECTED_HEADERS, $this->f1f2WipOutRepository, self::WIP_OUTS_LOCK_KEY, [$this, 'rowFormatterOUT'], $importDate, plColumnMap: $this->f1f2OutPlColumnMap);
  }

  private function resolveProductionLines(array $chunk, array $col): array
  {
    $combos = collect($chunk)
      ->map(fn($row) => [
        'package'    => $row[$col['package']],
        'factory' => isset($col['factory_override'])
          ? $col['factory_override']
          : ProductionLineResolver::factoryFromFocusGroup($row[$col['focus_group']]),
        'lead_count' => isset($col['lead_count']) ? $row[$col['lead_count']] : null,
        'part_name'  => $row[$col['part_name']],
      ])
      ->unique(fn($c) => "{$c['package']}|{$c['factory']}|{$c['lead_count']}|{$c['part_name']}")
      ->values();

    $resolved = $combos->mapWithKeys(fn($c) => [
      "{$c['package']}|{$c['factory']}|{$c['lead_count']}|{$c['part_name']}"
      => $this->resolver->resolve($c['package'], $c['factory'], $c['lead_count'], $c['part_name'])
    ]);

    return array_map(function ($row) use ($resolved, $col) {
      $factory = isset($col['factory_override'])
        ? $col['factory_override']
        : ProductionLineResolver::factoryFromFocusGroup($row[$col['focus_group']]);
      $leadCount = isset($col['lead_count']) ? $row[$col['lead_count']] : null;
      $key = "{$row[$col['package']]}|{$factory}|{$leadCount}|{$row[$col['part_name']]}";
      $row['production_line'] = $resolved->get($key);
      return $row;
    }, $chunk);
  }

  private function processCsvImport(
    string $filePath,
    $reader,
    $importedBy,
    array $expectedHeaders,
    $repository,
    string $lockKey,
    callable $rowFormatter,
    $importDate = null,
    ?array $plColumnMap = null
  ): array {
    $headersData = $this->excelValidator->getExcelCanonicalHeaderSpout($filePath, $expectedHeaders);
    $importDate = $importDate ?? now()->toDateString();

    if ($headersData['status'] === 'error') {
      return $headersData;
    }

    $found_headers = $headersData['found_headers'];
    $headerRowIndex = $headersData['headerRowIndex'];
    $map_headers = $headersData['map_headers'];

    $successCount = 0;
    $chunk = [];

    $lock = Cache::lock($lockKey, 100);
    if (!$lock->get()) {
      throw new Exception('The import is currently running. Try again in a few minutes.');
    }

    try {
      DB::beginTransaction();

      $reader->open($filePath);
      $currentRowIndex = 0;

      $repository->deleteTodayRecords($importDate);

      foreach ($reader->getSheetIterator() as $sheet) {
        foreach ($sheet->getRowIterator() as $row) {
          $currentRowIndex++;
          if ($currentRowIndex <= $headerRowIndex) continue;

          $rowCells = $row->toArray();
          if ($this->isEmptyRow($rowCells)) continue;

          $rowData = $this->extractRowData($map_headers, $rowCells, $found_headers);
          $rowData['imported_by'] = $importedBy;

          // custom formatting per type
          $rowData = $rowFormatter($rowData);
          $rowData['import_date'] = $importDate;

          $chunk[] = $rowData;

          if (count($chunk) >= self::CHUNK_SIZE) {
            if ($plColumnMap) {
              $chunk = $this->resolveProductionLines($chunk, $plColumnMap);
            }
            $this->insertChunk($chunk, fn($c) => $repository->insertManyCustomers($c), $successCount);
            $chunk = [];
          }
        }
        break;
      }

      if (!empty($chunk)) {
        if ($plColumnMap) {
          $chunk = $this->resolveProductionLines($chunk, $plColumnMap);
        }
        $this->insertChunk($chunk, fn($c) => $repository->insertManyCustomers($c), $successCount);
      }

      $this->importTraceRepository->upsertImport($repository->getImportKey(), $importedBy, $successCount);
      Cache::forget(WipConstants::TODAY_WIP_CACHE_KEY);

      $reader->close();
      unlink($filePath);

      DB::commit();

      return [
        'status' => 'success',
        'message' => $successCount === 0 ? 'No new records found.' : 'Import completed successfully.',
        'data' => [$repository->getImportKey() => $successCount],
        'total' => $successCount
      ];
    } catch (Exception $e) {
      DB::rollBack();

      Log::error('Import failed', ['error' => $e->getMessage()]);
      return ['status' => 'error', 'message' => $e->getMessage()];
    } finally {
      $lock->release();
    }
  }

  private function prepareExistingF3WipRecords(): array
  {
    $records = $this->f3WipRepository->getExistingRecords();
    $map = [];

    foreach ($records as $r) {
      $map["{$r->lot_number}-{$r->date_loaded}"] = true;
    }

    return $map;
  }

  private function prepareExistingF3OutRecords(): array
  {
    $records = $this->f3OutRepository->getExistingRecords();
    $map = [];

    foreach ($records as $r) {
      $map["{$r->lot_number}-{$r->date_loaded}"] = true;
    }

    return $map;
  }

  public function importCapacity($importedBy = null, $file)
  {
    $spreadsheet = IOFactory::load($file->getPathname(), $this->flags);
    $this->excelValidator->errorOnMultipleSheet($spreadsheet);

    $sheet = $spreadsheet->getActiveSheet();

    $data = [];
    $currentFactory = null;
    $rowIterator = $sheet->getRowIterator();

    $mergedCells = $sheet->getMergeCells();
    // Log::info('Merged cells: ' . print_r($mergedCells, true));
    $lastPackage = null;
    foreach ($rowIterator as $row) {
      $pos = $row->getRowIndex();

      $colA = trim($sheet->getCell([1, $pos])->getCalculatedValue());
      $colD = trim($sheet->getCell([4, $pos])->getCalculatedValue());

      // Log::info("pos: $pos, colA: $colA, colD: $colD");

      if (preg_match('/^F\d+/i', $colA)) {
        $currentFactory = $colA;
        continue;
      }

      if (preg_match('/Updated.*Capacity|Capacity.*Updated/i', $colA)) {
        continue;
      }

      if ($colA == 'Total' || $colA == 'Overall Total') {
        continue;
      }

      if (!empty($colA)) {
        // TODO might have separator for ColA
        $key = $colA . '|' . $currentFactory;

        $data[$key] = [
          'package_name' => $colA,
          'factory_name' => $currentFactory,
          'effective_from' => date('Y-m-d', strtotime('today')),
          // 'effective_from' => date('Y-m-d', strtotime('-10 day')),
          'capacity' => (int)$colD,
        ];

        $lastPackage = $key;
      } else {
        if ($lastPackage !== null) {
          $data[$lastPackage]['capacity'] += (int)$colD;
        }
      }
    }

    $total = count($data);

    // Log::info((
    //   "data: " . print_r($data, true)
    // ));

    $return = $this->packageCapacityService->upsertMultiple($data);
    $this->importTraceRepository->upsertImport('capacity', $importedBy, $total);

    return [
      'status' => 'success',
      'message' => 'Capacity Update completed',
      'data' => array_values($data),
      'updated' => $return['updated'],
      'created' => $return['created'],
      'total' => $total
    ];
  }

  protected function isEmptyRow(array $row): bool
  {
    return count(array_filter($row, fn($value) => $value !== null && $value !== '')) === 0;
  }

  protected function extractRowData(array $map, array $row, array $headers): array
  {
    $rowData = [];

    foreach ($map as $i => $colIndex) {
      $key = $headers[$i];
      $rowData[$key] = $row[$colIndex] ?? null;
    }

    return $rowData;
  }

  public function importF1F2PickUp($importedBy = null, $file, $isAllowDuplicate)
  {
    $spreadsheet = IOFactory::load($file->getPathname(), $this->flags);
    $this->excelValidator->errorOnMultipleSheet($spreadsheet);
    $sheet = $spreadsheet->getActiveSheet();

    // $sheetData = $this->getSanitizedSheetData($spreadsheet);

    $headersData = $this->excelValidator->getExcelCanonicalHeader($spreadsheet, WipConstants::IMPORT_F1F2_PICKUP_EXPECTED_HEADERS);

    if ($headersData['status'] === 'error') {
      return $headersData;
    }

    $found_headers = $headersData['found_headers'];
    $headerRowIndex = $headersData['headerRowIndex'];
    $map_headers = $headersData['map_headers'];

    $chunks = [];
    $rowsWithUnknownPartname = [];
    $successCount = 0;

    $rows = [];
    foreach ($sheet->getRowIterator($headerRowIndex + 1) as $row) {
      $cellIterator = $row->getCellIterator();

      $rowData = $this->excelValidator->isEmptyExcelRow($cellIterator);
      if (empty($rowData)) {
        continue;
      }

      $rowData = $this->extractRowData($map_headers, $rowData, $found_headers);
      $rows[] = $rowData;
      if (count($rows) > self::maximumAlreadyExistsRowCount) {
        array_shift($rows);
      }
    }

    $alreadyExists = $this->pickUpRepository->detectDuplicates($rows);

    if (!$alreadyExists->isEmpty() && !$isAllowDuplicate) {
      return [
        'status' => 'error',
        'message' => 'Some rows already exist. Please decide if you want to import them anyway.',
        'data' => [
          'already_exists' => $alreadyExists,
        ]
      ];
    }

    try {
      DB::beginTransaction();

      foreach ($sheet->getRowIterator($headerRowIndex + 1) as $row) {
        $cellIterator = $row->getCellIterator();

        $rowData = $this->excelValidator->isEmptyExcelRow($cellIterator);
        if (empty($rowData)) {
          continue;
        }

        Log::info("Processing row: " . print_r($rowData, true));

        $rowData = $this->extractRowData($map_headers, $rowData, $found_headers);

        $rowData['ADDED_BY'] = $importedBy;

        $partnameID = $this->partnameRepository->getIDByPartname($rowData['PARTNAME'] ?? null);
        if (!$partnameID) {
          $ignoredPartnameRows[] = [
            'devicename' => $rowData['PARTNAME'] ?? null,
            'package_type' => $rowData['PACKAGE'],
            'lead_count' => $rowData['LC'],
          ];
          $rowsWithUnknownPartname[] = $rowData;
        }

        $chunks[] = $rowData;

        if (count($chunks) >= self::CHUNK_SIZE) {
          $this->insertChunk($chunks, fn($chunks) => $this->pickUpRepository->insertMany($chunks), $successCount);
          $chunks = [];
        }
      }

      if (!empty($chunks)) {
        $this->insertChunk($chunks, fn($chunks) => $this->pickUpRepository->insertMany($chunks), $successCount);
      }

      $this->importTraceRepository->upsertImport('pickup', $importedBy, $successCount);

      DB::commit();

      return [
        'status' => 'success',
        'message' =>  $successCount === 0 ? 'No new records found.' : 'Import completed successfully.',
        'data' => [
          'total' => $successCount,
          'ignored_unknown_partname' => $rowsWithUnknownPartname,
          'ignored_unknown_partname_count' => count($rowsWithUnknownPartname),
        ]
      ];
    } catch (Exception $e) {
      DB::rollBack();

      return ['status' => 'error', 'message' => $e->getMessage()];
    }
  }

  public function importF3PickUp($importedBy = null, $file, $isAllowDuplicate)
  {
    $spreadsheet = IOFactory::load($file->getPathname(), $this->flags);
    $this->excelValidator->errorOnMultipleSheet($spreadsheet);
    // $sheetData = $this->getSanitizedSheetData($spreadsheet);
    $sheet = $spreadsheet->getActiveSheet();

    $headersData = $this->excelValidator->getExcelCanonicalHeader($spreadsheet, WipConstants::IMPORT_F3_PICKUP_EXPECTED_HEADERS);

    if ($headersData['status'] === 'error') {
      return $headersData;
    }

    $found_headers = $headersData['found_headers'];
    $headerRowIndex = $headersData['headerRowIndex'];
    $map_headers = $headersData['map_headers'];

    $chunks = [];
    $ignoredRows = [];
    $ignoredPartnameRows = [];
    $successCount = 0;
    $hasUnknownRows = false;

    $rows = [];
    foreach ($sheet->getRowIterator($headerRowIndex + 1) as $row) {
      $cellIterator = $row->getCellIterator();

      $rowData = $this->excelValidator->isEmptyExcelRow($cellIterator);
      if (empty($rowData)) {
        continue;
      }

      $rowData = $this->extractRowData($map_headers, $rowData, $found_headers);
      $f3RawPackage = $this->f3RawPackageRepository->getByRawPackage($rowData['PACKAGE'] ?? null);
      $partnameID = $this->partnameRepository->getIDByPartname($rowData['PARTNAME'] ?? null);

      $f3RawPackage = $this->f3RawPackageRepository->getByRawPackage($rowData['PACKAGE'] ?? null);

      $rows[] = $rowData;
      if (count($rows) > self::maximumAlreadyExistsRowCount) {
        array_shift($rows);
      }

      if (!$partnameID) {
        $rowData["Factory"] = "F3";
        $ignoredPartnameRows[] = [
          'devicename' => $rowData['PARTNAME'] ?? null,
          'areas' => $rowData['Factory'],
          'package_type' => $rowData['PACKAGE'],
        ];
      }

      if (!$f3RawPackage) {
        $ignoredRows[] = $rowData;
        $hasUnknownRows = true;
      }
    }

    Log::info("rows: " . print_r($rows, true));

    $alreadyExists = $this->pickUpRepository->detectDuplicates($rows);

    if (!$alreadyExists->isEmpty() && !$isAllowDuplicate) {
      return [
        'status' => 'error',
        'message' => 'Some rows already exist. Please decide if you want to import them anyway.',
        'data' => [
          'already_exists' => $alreadyExists,
        ]
      ];
    }

    if ($hasUnknownRows) {
      return [
        'status' => 'error',
        'message' => 'File contains unknown packages. No rows were imported. Try again after resolving the issues.',
        'data' => [
          'ignored_unknown_package' => $ignoredRows,
          'ignored_unknown_package_count' => count($ignoredRows),
        ]
      ];
    }

    try {
      DB::beginTransaction();

      foreach ($sheet->getRowIterator($headerRowIndex + 1) as $row) {
        $cellIterator = $row->getCellIterator();

        $rowData = $this->excelValidator->isEmptyExcelRow($cellIterator);
        if (empty($rowData)) {
          continue;
        }

        $rowData = $this->extractRowData($map_headers, $rowData, $found_headers);

        $f3RawPackage = $this->f3RawPackageRepository->getByRawPackage($rowData['PACKAGE'] ?? null);
        $rowData['ADDED_BY'] = $importedBy;
        $rowData['PACKAGE'] = $f3RawPackage->package_name;
        $rowData['LC'] = $f3RawPackage->lead_count;
        $chunks[] = $rowData;

        if (count($chunks) >= self::CHUNK_SIZE) {
          $this->insertChunk($chunks, fn($chunks) => $this->pickUpRepository->insertF3Many($chunks), $successCount);
          $chunks = [];
        }
      }

      if (!empty($chunks)) {
        $this->insertChunk($chunks, fn($chunks) => $this->pickUpRepository->insertF3Many($chunks), $successCount);
      }

      $this->importTraceRepository->upsertImport('f3_pickup', $importedBy, $successCount);

      DB::commit();

      return [
        'status' => 'success',
        'message' =>  $successCount === 0 ? 'No new records found.' : 'Import completed successfully.',
        'data' => [
          'ignored_unknown_partname' => $ignoredPartnameRows,
          'ignored_unknown_partname_count' => count($ignoredPartnameRows),
          'total' => $successCount,
        ]
      ];
    } catch (Exception $e) {
      DB::rollBack();

      return ['status' => 'error', 'message' => $e->getMessage()];
    }
  }

  public function importF3($importedBy = null, $file, $importDate = null)
  {
    try {
      $spreadsheet = IOFactory::load($file->getPathname(), $this->flags);
      $this->excelValidator->errorOnMultipleSheet($spreadsheet);
      $sheet = $spreadsheet->getActiveSheet();

      $headersData = $this->excelValidator->getExcelCanonicalHeader($spreadsheet, WipConstants::IMPORT_F3_WIP_EXPECTED_HEADERS);
      if ($headersData['status'] === 'error') {
        return $headersData;
      }

      $found_headers = $headersData['found_headers'];
      $headerRowIndex = $headersData['headerRowIndex'];
      $map_headers = $headersData['map_headers'];
      $lastColumn = $headersData['last_column'];

      $chunksWip = [];
      $ignoredRows = [];
      $successCount = 0;

      DB::beginTransaction();

      $this->f3WipRepository->deleteTodayRecords($importDate);

      $packageNameMap = $this->f3RawPackageRepository->getAllAsMap();

      foreach ($sheet->getRowIterator($headerRowIndex + 1) as $row) {
        $cellIterator = $row->getCellIterator(endColumn: $lastColumn);

        $rowData = $this->excelValidator->isEmptyExcelRow($cellIterator);
        if (empty($rowData)) {
          continue;
        }

        $rowData = $this->extractRowData($map_headers, $rowData, $found_headers);

        $rowData['imported_by'] = $importedBy;
        $rowData['date_received'] = $this->parseDate($rowData['date_received'] ?? null);
        $rowData['date_loaded'] = $this->parseDate($rowData['date_loaded'] ?? null);
        $rowData['actual_date_time'] = $this->parseDate($rowData['actual_date_time'] ?? null);
        $rowData['date_commit'] = $this->parseDate($rowData['date_commit'] ?? null);
        $rowData['import_date'] = $importDate;

        $rowData['doable'] = $this->sanitizeInteger($rowData['doable'] ?? null);
        $rowData['qty'] = $this->sanitizeInteger($rowData['qty'] ?? null);
        $rowData['good'] = $this->sanitizeInteger($rowData['good'] ?? null);
        $rowData['rej'] = $this->sanitizeInteger($rowData['rej'] ?? null);
        $rowData['res'] = $this->sanitizeInteger($rowData['res'] ?? null);

        $packageID = $this->f3RawPackageRepository->getIDByRawPackage($rowData['package'] ?? null);
        if (!$packageID) {
          $ignoredRows[] = $rowData;
          continue;
        }

        $rowData['package'] = $packageID;
        $chunksWip[] = $rowData;

        if (count($chunksWip) >= self::CHUNK_SIZE) {
          $chunk = array_map(function ($row) use ($packageNameMap) {
            $meta = $packageNameMap[$row['package']] ?? null;
            $row['_package_name'] = $meta['package_name'] ?? null;
            $row['_lead_count']   = $meta['lead_count'] ?? null;
            return $row;
          }, $chunksWip);

          $chunk = $this->resolveProductionLines($chunk, $this->f3PlColumnMap);

          $chunk = array_map(function ($row) {
            unset($row['_package_name'], $row['_lead_count']);
            return $row;
          }, $chunk);

          $this->insertChunk(
            $chunk,
            fn($chunks) => $this->f3WipRepository->insertManyF3($chunks),
            $successCount
          );
          $chunksWip = [];
        }
      }

      if (!empty($chunksWip)) {
        $chunk = array_map(function ($row) use ($packageNameMap) {
          $meta = $packageNameMap[$row['package']] ?? null;
          $row['_package_name'] = $meta['package_name'] ?? null;
          $row['_lead_count']   = $meta['lead_count'] ?? null;
          return $row;
        }, $chunksWip);

        $chunk = $this->resolveProductionLines($chunk, $this->f3PlColumnMap);

        $chunk = array_map(function ($row) {
          unset($row['_package_name'], $row['_lead_count']);
          return $row;
        }, $chunk);

        $this->insertChunk(
          $chunk,
          fn($chunks) => $this->f3WipRepository->insertManyF3($chunks),
          $successCount
        );
      }

      $this->importTraceRepository->upsertImport('f3', $importedBy, $successCount);

      DB::commit();

      return [
        'status' => 'success',
        'message' => $successCount === 0 ? 'No new records found.' : 'Import completed successfully.',
        'data' => [
          'total' => $successCount,
          'ignored_unknown_package' => array_slice($ignoredRows, 0, 100),
          'ignored_unknown_package_count' => count($ignoredRows),
        ]
      ];
    } catch (\Throwable $e) {
      DB::rollBack();
      Log::error('Import failed: ' . $e->getMessage());
      return [
        'status' => 'error',
        'message' => 'Import failed.' . ' Error: ' . $e->getMessage(),
        'error' => $e->getMessage()
      ];
    }
  }
}
