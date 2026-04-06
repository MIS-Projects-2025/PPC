<?php

namespace App\Traits;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use ZipArchive;
use Box\Spout\Writer\Common\Creator\WriterEntityFactory;
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;

trait ExportTrait
{
  protected function downloadRawXlsx(array $sheets, string $filenamePrefix)
  {
    $tempFile = tempnam(sys_get_temp_dir(), 'ppc_export_');

    $writer = WriterEntityFactory::createXLSXWriter();
    $writer->setShouldCreateNewSheetsAutomatically(false);
    $writer->openToFile($tempFile);

    $style = (new StyleBuilder())
      ->setShouldWrapText(false)
      ->build();

    $isFirstSheet = true;

    foreach ($sheets as $sheetName => $queryFn) {
      $rows = $queryFn();

      if (!$rows || $rows->isEmpty()) {
        continue;
      }

      if ($isFirstSheet) {
        $writer->getCurrentSheet()->setName($sheetName);
        $isFirstSheet = false;
      } else {
        $writer->addNewSheetAndMakeItCurrent();
        $writer->getCurrentSheet()->setName($sheetName);
      }

      $firstRow = (array) $rows->first();
      $columns = array_keys($firstRow);
      $writer->addRow(WriterEntityFactory::createRowFromArray($columns, $style));

      foreach ($rows as $row) {
        $writer->addRow(WriterEntityFactory::createRowFromArray((array) $row, $style));
      }

      unset($rows);
    }

    $writer->close();

    if (ob_get_level()) {
      ob_end_clean();
    }

    $filename = "{$filenamePrefix}_" . now()->format('Ymd_His') . ".xlsx";

    $headers = [
      'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition' => 'attachment; filename="' . $filename . '"',
    ];

    return response()
      ->download($tempFile, $filename, $headers)
      ->deleteFileAfterSend(true);
  }
}
