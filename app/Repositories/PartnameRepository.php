<?php

namespace App\Repositories;

use App\Traits\TrendAggregationTrait;

use Illuminate\Support\Facades\DB;
use App\Constants\WipConstants;
use App\Helpers\WipTrendParser;
use Illuminate\Support\Facades\Log;
use App\Helpers\SqlDebugHelper;
use App\Helpers\MergeAndAggregate;
use Carbon\Carbon;
use App\Models\PartName;
use App\Models\F3Pickup;

class PartnameRepository
{
  public function getIDByPartname(?string $partname): ?int
  {
    return PartName::where('devicename', $partname)
      ->value('id');
  }
}
