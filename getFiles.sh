  # Entries can be:
  #   - a bare name        -> "StatusBadge"  (searched recursively as .php/.js/.jsx/.css)
  #   - a relative file    -> 'resources\js\Pages\LoadingPlan\Settings\CapacityBandSettings.jsx'
  #   - a relative folder  -> 'resources/js/Pages/LoadingPlan/Settings'  (all php/js/jsx/css inside)
  # Anything containing a slash (or starting with ./) is treated as a path.
  # Use SINGLE quotes for backslash paths so bash doesn't eat the backslashes.

  targets=(
    #################### WIP CON
    #"LotsUpstream"
    #"lotUpstreamModes"
    #"useBarcodeScanner"
    #"useLotActions"
    #"SourceMatchPanel"
    #"RecommendationLine"
    #"useLotStore"
    #"SearchInput"
    #"parseLotScanInput"
    #"RackTopView"
    #"useLotMatch"
    #"Rack"
##
    #"formatLocalTime"
    #"LotRunTooltip"
    #"AudioService"
    #"Pagination"
    #"useToast"
##
    #"Rack"
    #"RackPage"
    #"RackSlotController"
    #"BoxDetails"
    #"LotController"
    #"LotService"
    #"LotRepositoryInterface"
    #"LotPositionRepositoryInterface"
    #"RackRepositoryInterface"
    #"RackRepository"
    #"LotRepository"
    #"LotPositionRepository"
    #"RackSlotRepository"
    #"RackSlotRepositoryInterface"
    #"LotRunRepositoryInterface"
    #"Lot"
    #"LotStaging"
    #"LotPosition"
    #"RackSlot"
    #"RecommendationService"
    #"PlacementSetting"
    #"PlacementRecommendation"
    #"BoxDimension"
    #"ProcessTraveler"
    #"BoxInfoOverride"
    #"LotSourceRepository"
    #"2026_11_09_000000_add_placement_recommendation_schema"
    #"2026_11_09_00000_visible_recommendation"
    #"2026_11_10_000000_create_rack_floor_map_tables"
    #"2026_11_11_000000_edit_box_and_rack_slot_dimension_to_decimal"
    #"2026_11_11_000001_add_name_to_box_dimensions_table"
    #"2026_11_11_000002_add_box_group_id_to_lot_stagings"
    #"2026_11_12_000001_add_source_box_fields"
##
  ##
    #"2026_11_09_000000_add_placement_recommendation_schema" 
    #"2026_11_09_00000_visible_recommendation" 
    #"2026_11_10_000000_create_rack_floor_map_tables" 
    #"2026_11_11_000000_edit_box_and_rack_slot_dimension_to_decimal" 
    #"2026_11_11_000001_add_name_to_box_dimensions_table" 
    #"2026_11_11_000002_add_box_group_id_to_lot_stagings" 
    #"2026_11_12_000001_add_source_box_fields"

    ##################### ---- PHP (matched in your output) ----
    "PickUp"
    "PickupPoolService"
    "PickupPoolController"

    "ValidatesLoadingPlanEntries"
    #
    ###"LotSourceService"
    ###"ProcessTraveler"
    ###"LoadingPlanFormulas"
    ###"ShiftDay"
    ###"RecipeService"
    ###"LoadingPlanController"
    ###"LoadingPlanEntryService"
    ###"LoadingPlanEntry"
    ###"LoadingPlanEntryController"
    ###"LotQuantity"
    ###"LotScheduleCalculator"
    ###"CustomerDataWip"
    ###"LoadingPlanService"
    ###"PackageLocation"
    #
    ###"LotPrioritySorter"
    #
    ###"LotSplit"
    ###"LoadingPlanSplitController"
    ###"LoadingPlanMergeController"
    ###"LotMergeService"
    ###"LotSplitService"
    #
    ###"NonMachineController"
    #
    ###"LoadingPlanEntryHistory"
    #
    ###"LoadingPlanBucket"
    ###"LoadingPlanBucketController"
    ###"LotBucketItem"
    #
    ###"SchedulerService"
##
    ###"BakeLotService"
    ###"MachinePlatformCapacityBand"
    ###"MachinePlatformCapacityBandController"
    ##
    ###"LoadingPlanEntryObserver"
    ###"LotQuantityObserver"
    ###"BaseHistoryObserver"
    ##
###
    ####################### Models
    ###"BoschPart"
    ###"BoschPartSettings"
    ###"CapacityBand"
##
    ####################### web
    "routes\loading-plan.php"
    # "routes\auth.php"
    # "routes\web.php"
    ##
    ####################### ---- Non-PHP (JS/JSX, classified by naming; none matched) ----
    ###"Deemo"
##
    "columns"
    "NonMachinesModal"
    "DroppableRow"
    "StatusBadge"
    "MachineSelectionGrid"
    "PlanToolbar"
    "SelectionToolbar"
    "RowHoverTools"
    "TransferMachinePicker"
    "StickyHeaderOverlay"
    "tabs"
    "buildDisplayRows"
    "columnConfig"
    "columnSizing"
    "rowPredicates"
    "splitMergeApi"
    "CellEditor"
    "loadingPlanSchedule"
    "TableActionsContext"
    "undoStore"
    "sync"
    "helpers"
    "capacityOverview"
    "ptpOverview"
    "PtpOverview"
    "loadingPlanExcelExporter"

##
    ######################## hooks
    ###"useDragPreview" # only for visual (no logic)
##
##
    ###"useRowFlip"
    ###"useColumnWidths"
    ###"useDoableOperations"
    ###"useEntryOperations"
    ###"useLoadingPlanShortcuts"
    ###"useRowIndex"
    ###"useWriteLock"
    ###"useNonMachineOperations"
    ###"useSplitMergeOperations"
    ###"useStickyGroupHeader"
    ###"useDragReorder"
    ###"useBulkOperations"
    ###"useMutation"
    ###"useRowHoverInsert"
    ###"useUndoRedoSync"
    ###"useDialogOpen"
    ###"useBucketOperations"
    ###"usePersistedSet"
    ###"useMachineJump"
    ###"useCellEditPersistence"
##
    ######################## MODAL
    "CapacityOverviewModal"
    "AutoSortModal"
    "ColumnVisibilityModal"
    "MissingPartsModal"
    "QuickAddModals"
    "DoableEditModal"
    "SchedulerModal"
    "modal"
    "TransferModal"
    "SplitHistoryModal"
    "MergeHistoryModal"
##
    ########### USER
    #"Employee"
    #"EmployeeDirectory"
    #"SessionMiddleware"
    #"ReadOnlyMode"
    #"login"
    #"LoginController"
    #"ApiAuthMiddleware"
    #"ApiPermissionMiddleware"
#
    ####################### ---- paths (file or folder) ----
    ##'resources\js\Pages\LoadingPlan\Settings\Index'
    #### # './app'
#
    #"loading-plan" # css

    # HOURLY OUTPUT MONITORING
    # HOURLY OUTPUT MONITORING
    "app/Http/Controllers/HourlyMonitoring/EmployeeController.php"
    "app/Http/Controllers/HourlyMonitoring/HourlyMonitoringController.php"
    "app/Http/Controllers/HourlyMonitoring/SheetController.php"
    "app/Http/Controllers/HourlyMonitoring/SheetRowController.php"
    "app/Http/Controllers/HourlyMonitoring/SummaryController.php"
    "app/Http/Requests/HourlyMonitoring/ApplyRowChangesRequest.php"
    "app/Http/Requests/HourlyMonitoring/DateRequest.php"
    "app/Http/Requests/HourlyMonitoring/EmployeeSearchRequest.php"
    "app/Http/Resources/HourlyMonitoring/DowntimeCodeResource.php"
    "app/Http/Resources/HourlyMonitoring/HourlyRowResource.php"
    "app/Http/Resources/HourlyMonitoring/HourlySheetResource.php"
    "app/Models/Concerns/TracksActor.php"
    "app/Models/DowntimeCode.php"
    "app/Models/FviHourlyRow.php"
    "app/Models/HourlyCell.php"
    "app/Models/HourlyRow.php"
    "app/Models/HourlySheet.php"
    "app/Models/MachineHourlyRow.php"
    "app/Services/HourlyMonitoring/CellValueParser.php"
    "app/Services/HourlyMonitoring/EmployeeLookupService.php"
    "app/Services/HourlyMonitoring/HourlyRowService.php"
    "app/Services/HourlyMonitoring/SheetService.php"
    "app/Services/HourlyMonitoring/SummaryService.php"
    "config/hourly_monitoring.php"
    "database/migrations/2026_11_24_100001_create_downtime_code_table.php"
    "database/migrations/2026_11_24_100002_create_hourly_sheets_table.php"
    "database/migrations/2026_11_24_100003_create_hourly_rows_tables.php"
    "database/migrations/2026_11_24_100004_create_hourly_cells_table.php"
    #"database/seeders/DowntimeCodeSeeder.php"

    # frontend
    "resources/js/Pages/HourlyMonitoring/Index.jsx"
    "resources/js/hourly-monitoring/HourlyGrid.jsx"
    "resources/js/hourly-monitoring/SuggestEditor.jsx"
    "resources/js/hourly-monitoring/SummaryView.jsx"
    "resources/js/hourly-monitoring/api.js"
    "resources/js/hourly-monitoring/cellUtils.js"
    "resources/js/hourly-monitoring/columns.jsx"
    "resources/js/hourly-monitoring/hourly-monitoring.css"
    "resources/js/hourly-monitoring/types.js"
    "routes/hourly-monitoring.php"
  )


  PRUNE=( -type d \( -name node_modules -o -name vendor \) -prune -o )
  EXT_MATCH=( \( -name '*.php' -o -name '*.js' -o -name '*.jsx' -o -name '*.css' \) )

  resolve() {
    local raw="$1"
    local t="${raw//\\//}"          # backslashes -> forward slashes
    local is_path=0
    [[ "$t" == */* ]] && is_path=1  # also true for ./foo
    t="${t#./}"                     # strip leading ./
    t="${t%/}"                      # strip trailing /

    if (( is_path )); then
      if [[ -f "$t" ]]; then
        printf '%s\0' "$t"
      elif [[ -d "$t" ]]; then
        find "$t" "${PRUNE[@]}" -type f "${EXT_MATCH[@]}" -print0
      else
        echo "WARN: path not found: $raw" >&2
      fi
    elif [[ -d "$t" && "$raw" == ./* ]]; then
      find "$t" "${PRUNE[@]}" -type f "${EXT_MATCH[@]}" -print0
    else
      find . "${PRUNE[@]}" -type f \( \
          -name "$t.php" -o -name "$t.js" -o -name "$t.jsx" -o -name "$t.css" \
        \) -print0
    fi
  }

  for t in "${targets[@]}"; do
    resolve "$t"
  done |
  {
    declare -A seen
    count=0
    while IFS= read -r -d '' file; do
      file="${file#./}"
      [[ -n "${seen[$file]}" ]] && continue   # dedupe (name + folder overlap)
      seen[$file]=1
      ((count++))
      echo "## FILE: $file"
      echo '```'
      cat "$file"
      echo '```'
      echo
    done
    echo "Copied $count file(s)" >&2
  } | iconv -f UTF-8 -t UTF-16LE | clip.exe