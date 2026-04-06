<?php

namespace App\Services;

use Symfony\Component\HttpFoundation\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Illuminate\Support\Facades\Log;
use Box\Spout\Reader\Common\Creator\ReaderEntityFactory;
use Box\Spout\Reader\ReaderInterface;
use PhpOffice\PhpSpreadsheet\Worksheet\CellIterator;
use App\Traits\Sanitize;

class ExcelValidatorService
{
  use Sanitize;

  public function isFileExists($filePath): bool
  {
    return file_exists($filePath);
  }

  public function isValidExcelFile($filePath): bool
  {
    $validExtensions = ['xls', 'xlsx', 'csv'];
    $fileExtension = pathinfo($filePath, PATHINFO_EXTENSION);

    return in_array(strtolower($fileExtension), $validExtensions);
  }

  private function looksLikeDate($value): bool
  {
    if (!is_string($value)) return false;
    // Simple date patterns (YYYY-MM-DD, MM/DD/YYYY, etc.)
    return preg_match('/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/', $value);
  }

  // private function scoreHeaderRow(array $row): float
  // {
  //   $nonEmpty = 0;
  //   $stringCells = 0;
  //   $numericCells = 0;

  //   // Log::info("Row: " . print_r($row, true));

  //   foreach ($row as $cell) {
  //     if (!is_null($cell) && trim($cell) !== '') {
  //       $nonEmpty++;
  //       if (is_numeric($cell) || $this->looksLikeDate($cell)) {
  //         $numericCells++;
  //       } else {
  //         $stringCells++;
  //       }
  //     }
  //   }

  //   if ($nonEmpty === 0) {
  //     return -1; // empty row, ignore
  //   }

  //   // Score: prefer rows that are mostly strings
  //   return $stringCells / $nonEmpty;
  // }

  private function scoreHeaderRow(array $row, array $aliasMap): float
  {
    $nonEmpty = 0;
    $scoreSum = 0.0;

    foreach ($row as $cell) {
      if (!is_null($cell) && trim((string)$cell) !== '') {
        $nonEmpty++;
        $normalized = $this->normalize((string)$cell);
        $scoreSum += $this->matchesAnyAlias($normalized, $aliasMap);
      }
    }

    if ($nonEmpty === 0) return -1;

    return $scoreSum / $nonEmpty;
  }

  private function normalize($value)
  {
    $value = preg_replace('/\-+/', ' ', $value);
    $value = preg_replace('/\s+/', ' ', $value);

    return strtolower(trim($value));
  }

  private function fuzzyMatch($header, $canonical)
  {
    $header = $this->normalize($header);

    $bestKey = null;
    $bestDistance = PHP_INT_MAX;

    foreach ($canonical as $aliasNorm => $key) {
      $dist = levenshtein($header, $aliasNorm);

      if ($dist < $bestDistance) {
        $bestDistance = $dist;
        $bestKey = $key;
      }
    }

    return $bestDistance <= 1 ? $bestKey : null;
  }

  /**
   * Core method to process and map headers
   */
  private function processHeaders(array $headerRow, array $expectedHeaders)
  {
    $headers = array_map([$this, 'normalize'], $headerRow);

    // Build canonical mapping
    $canonical = [];
    foreach ($expectedHeaders as $key => $aliases) {
      foreach ($aliases as $alias) {
        $canonical[$this->normalize($alias)] = $key;
      }
    }

    $found = [];
    $unknown = [];
    $map = [];

    foreach ($headers as $idx => $h) {
      $hNorm = $this->normalize($h);
      if (isset($canonical[$hNorm])) {
        $found[] = $canonical[$hNorm];
        $map[] = $idx;
      } else {
        $match = $this->fuzzyMatch($hNorm, $canonical);
        if ($match !== null) {
          $found[] = $match;
          $map[] = $idx;
        } else {
          $unknown[] = $h;
        }
      }
    }

    // Log::info("headers: " . print_r($headers, true));
    // Log::info("map: " . print_r($map, true));
    // Log::info("found: " . print_r($found, true));

    $missing = array_diff(array_keys($expectedHeaders), $found);
    $valid = empty($missing);

    if (!$valid) {
      return [
        'status' => 'error',
        'errorType' => 'INVALID_HEADERS',
        'message' => 'Some required headers are missing or unrecognized.',
        'data' => [
          'missing_headers' => array_values($missing),
          'unknown_headers' => array_values($unknown),
          'found_headers' => $found,
        ],
      ];
    }

    return [
      'status' => 'success',
      'headers' => $headers,
      'found_headers' => $found,
      'map_headers' => $map,
    ];
  }

  private function buildAliasMap(array $expectedHeaders): array
  {
    $map = [];
    foreach ($expectedHeaders as $key => $aliases) {
      foreach ($aliases as $alias) {
        $map[$this->normalize($alias)] = $key;
      }
    }
    return $map;
  }

  private function matchesAnyAlias(string $normalized, array $aliasMap): float
  {
    if (isset($aliasMap[$normalized])) {
      return 1.0;
    }

    $bestPartial = 0.0;
    foreach ($aliasMap as $alias => $_) {
      if ($alias === '') continue;

      if (str_contains($normalized, $alias) || str_contains($alias, $normalized)) {
        $longer = max(strlen($normalized), strlen($alias));
        $shorter = min(strlen($normalized), strlen($alias));
        $partial = $shorter / $longer;

        if ($partial > $bestPartial) {
          $bestPartial = $partial;
        }
      }
    }

    // Only count partial if it's a meaningful overlap (>50%)
    return $bestPartial >= 0.5 ? $bestPartial * 0.5 : 0.0;
  }

  public function errorOnMultipleSheet(Spreadsheet $spreadsheet)
  {
    if ($spreadsheet->getSheetCount() > 1) {
      throw new \Exception('Multiple sheets detected in the Excel file. Please ensure the file contains only one sheet. Even hidden sheets are not allowed.', Response::HTTP_UNPROCESSABLE_ENTITY);
    }
  }

  /**
   * Get canonical headers from PhpSpreadsheet
   */
  public function getExcelCanonicalHeader(Spreadsheet $spreadsheet, array $expectedHeaders)
  {
    $sheet = $spreadsheet->getActiveSheet();

    $highestRow = 1;
    $highestColumn = 'A';

    foreach ($sheet->getRowIterator() as $row) {
      $cellIterator = $row->getCellIterator();
      $cellIterator->setIterateOnlyExistingCells(true);

      foreach ($cellIterator as $cell) {
        $value = $cell->getValue();
        if ($value !== null && $value !== '') {
          $highestRow = max($highestRow, $row->getRowIndex());
          $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($cell->getColumn());
          $highestCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestColumn);
          if ($col > $highestCol) {
            $highestColumn = $cell->getColumn();
          }
        }
      }
    }

    if ($highestRow <= 1) {
      return [
        'status' => 'error',
        'errorType' => 'EMPTY_SHEET',
        'message' => 'The Excel sheet seemed empty.',
        'data' => [],
      ];
    }

    $aliasMap = $this->buildAliasMap($expectedHeaders);

    $bestScore = -1;
    $headerRow = null;
    $headerRowIndex = 1;

    for ($row = 1; $row <= 10; $row++) {
      $currentRow = $sheet->rangeToArray("A{$row}:{$highestColumn}{$row}", null, true, true, false)[0];
      // $score = $this->scoreHeaderRow($currentRow);
      $score = $this->scoreHeaderRow($currentRow, $aliasMap);

      if ($score >= $bestScore) {
        $bestScore = $score;
        $headerRow = $currentRow;
        $headerRowIndex = $row;
      }
    }

    if (!$headerRow) {
      $headerRow = $sheet->rangeToArray("A1:{$highestColumn}1", null, true, true, false)[0];
    }

    if (!$headerRow) {
      return [
        'status' => 'error',
        'errorType' => 'EMPTY_SHEET',
        'message' => 'The CSV file appears to be empty.',
        'data' => [],
      ];
    }

    $result = $this->processHeaders($headerRow, $expectedHeaders);

    if (($result['status'] ?? null) === 'error') {
      return $result;
    }

    $result['headerRowIndex'] = $headerRowIndex;

    $lastColumnIndex = max($result['map_headers']) + 1; // +1 because columnIndexFromString is 1-based
    $lastColumn = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($lastColumnIndex);
    $result['last_column'] = $lastColumn;

    $firstNonEmpty = array_key_first(array_filter($headerRow, fn($v) => $v !== null && $v !== ''));
    $startColumn = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($firstNonEmpty + 1);

    if ($startColumn !== 'A') {
      return [
        'status' => 'error',
        'errorType' => 'INVALID_START_COLUMN',
        'message' => 'Headers must start at column A.',
      ];
    }

    return $result;
  }

  /**
   * Get canonical headers from Spout CSV
   */
  public function getExcelCanonicalHeaderSpout(string $filePath, array $expectedHeaders)
  {
    $reader = ReaderEntityFactory::createCSVReader();
    $reader->open($filePath);

    $bestScore = -1;
    $headerRow = null;
    $headerRowIndex = 1;
    $currentRowIndex = 0;

    $aliasMap = $this->buildAliasMap($expectedHeaders);

    foreach ($reader->getSheetIterator() as $sheet) {
      foreach ($sheet->getRowIterator() as $row) {
        $currentRowIndex++;
        if ($currentRowIndex > 10) break;

        $cells = $row->toArray();
        $score = $this->scoreHeaderRow($cells, $aliasMap);

        if ($score >= $bestScore) {
          $bestScore = $score;
          $headerRow = $row->toArray();
          $headerRowIndex = $currentRowIndex;
        }

        // if ($score > $bestScore) {
        //   $bestScore = $score;
        //   $headerRow = $cells;
        //   $headerRowIndex = $currentRowIndex;
        // }
      }
      break; // only first sheet
    }

    $reader->close();

    // fallback: first row
    if (!$headerRow) {
      $reader->open($filePath);
      foreach ($reader->getSheetIterator() as $sheet) {
        $headerRow = $sheet->getRowIterator()->current()->toArray();
        break;
      }
      $reader->close();
    }

    if (!$headerRow) {
      return [
        'status' => 'error',
        'errorType' => 'EMPTY_SHEET',
        'message' => 'The CSV file appears to be empty.',
        'data' => [],
      ];
    }

    $result = $this->processHeaders($headerRow, $expectedHeaders);
    $result['headerRowIndex'] = $headerRowIndex;

    return $result;
  }

  public function isEmptyExcelRow(CellIterator $cellIterator): array
  {
    $cellIterator->setIterateOnlyExistingCells(false);

    $rowData = [];
    $hasData = false;

    foreach ($cellIterator as $cell) {
      $value = $cell->getCalculatedValue();
      $sanitized = $this->sanitizeExcelCell($value);
      $rowData[] = $sanitized;

      if ($sanitized !== null && $sanitized !== '') {
        $hasData = true;
      }
    }

    return $hasData === false ? [] : $rowData;
  }
}
