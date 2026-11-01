import { TabBadge, DATA_INTEGRITY_MODAL_ID } from "@/Components/LoadingPlan/DataIntegrityModal";
import interactiveCursorClasses from "@/Components/LoadingPlan/interactiveCursorClasses";
import { NON_MACHINES_MODAL_ID } from "@/Components/LoadingPlan/NonMachinesModal";
import ScrollableTabs from "@/Components/LoadingPlan/ScrollableTabs";
import { getStatusMessage } from "@/Constants/wipStatus.js";
import { showModal } from "@/Lib/LoadingPlan/modal";
import { Link } from "@inertiajs/react";
import clsx from "clsx";
import { BsGear, BsSearch } from "react-icons/bs";
import { GoAlert } from "react-icons/go";
import { CAPACITY_OVERVIEW_MODAL_ID } from "./CapacityOverviewModal";
import { COLUMN_VISIBILITY_MODAL_ID } from "./ColumnVisibilityModal";
import { SCHEDULER_MODAL_ID } from "./SchedulerModal";

const PRODUCTION_LINES = ["PL1", "PL6", "F3"];

/** Red banner when the day's import isn't "ok". */
export function PlanStatusAlert({ status, date, readOnly, onGoToImport }) {
    if (!status || status === "ok") return null;

    return (
        <div className="flex text-sm py-0 px-2 alert alert-error alert-soft">
            <GoAlert size={16} />
            <div role="alert">{getStatusMessage(date, status)}</div>
            {!readOnly && (
                <button type="button" onClick={onGoToImport} className="btn p-0 btn-link">
                    Go to Import
                </button>
            )}
        </div>
    );
}

function UndoRedoButtons({ canUndo, canRedo, locked, onUndo, onRedo }) {
    const cls = (disabled) =>
        clsx(
            "btn btn-ghost px-2 py-1 text-xs rounded border border-base-300 text-base-content/60 disabled:opacity-30 hover:bg-base-200",
            interactiveCursorClasses(disabled),
        );

    return (
        <>
            <button onClick={onUndo} disabled={!canUndo || locked} className={cls(!canUndo || locked)} title="Undo (Ctrl+Z)">
                ↩ Undo
            </button>
            <button onClick={onRedo} disabled={!canRedo || locked} className={cls(!canRedo || locked)} title="Redo (Ctrl+Y)">
                ↪ Redo
            </button>
        </>
    );
}

const Divider = () => <div className="w-px h-4 bg-base-300 mx-1" />;

/** Right side of the first toolbar row: save/selection info, undo/redo and the action buttons. */
export function PlanActionsBar({
    readOnly,
    isUpdating,
    writesLocked,
    selectedCount,
    onClearSelection,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    isExporting,
    onExport,
    hasHiddenColumns,
    allMachinesCollapsed,
    canToggleMachines,
    onToggleMachines,
    schedulerFailed,
    showDataIntegrity,
    dataIntegrityCount,
    missingPartCount,
    onOpenMissingParts,
}) {
    return (
        <div className="flex items-center">
            {isUpdating ? (
                <span className="flex items-center gap-1.5 text-xs text-info">
                    <span className="loading loading-spinner loading-xs" /> Saving…
                </span>
            ) : !readOnly && selectedCount > 0 ? (
                <span className="flex items-center gap-1.5 text-xs text-info whitespace-nowrap">
                    {selectedCount} row{selectedCount !== 1 ? "s" : ""} selected
                    <button onClick={onClearSelection} className="underline underline-offset-2">Deselect all</button>
                </span>
            ) : null}

            {!readOnly && (
                <>
                    <Divider />
                    <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} locked={writesLocked} onUndo={onUndo} onRedo={onRedo} />
                </>
            )}

            <Divider />

            <div className="flex gap-2">
                {!readOnly && (
                    <Link href="/loading-plan/settings" className="btn btn-sm">
                        <BsGear size={16} /> <span>Settings</span>
                    </Link>
                )}

                <button className="btn btn-sm" onClick={onExport} disabled={isExporting}>
                    {isExporting ? "Exporting…" : "Export to Excel"}
                </button>

                <button className="btn btn-sm" onClick={() => showModal(COLUMN_VISIBILITY_MODAL_ID)} title="Show/hide columns">
                    Columns
                    {hasHiddenColumns && <span className="w-1.5 h-1.5 rounded-full bg-warning ml-1" />}
                </button>

                <button
                    className="btn btn-sm"
                    onClick={onToggleMachines}
                    disabled={!canToggleMachines}
                    title={allMachinesCollapsed ? "Expand all machines" : "Collapse all machines"}
                >
                    {allMachinesCollapsed ? "▼ Expand all" : "► Collapse all"}
                </button>

                <button className="btn btn-sm" onClick={() => showModal(CAPACITY_OVERVIEW_MODAL_ID)} title="Commit vs capacity for all machines">
                    Capacity
                </button>

                {!readOnly && (
                    <button className="btn btn-sm" onClick={() => showModal(NON_MACHINES_MODAL_ID)}>Non-machines</button>
                )}

                {!readOnly && (
                    <button className="btn btn-sm" onClick={() => showModal(SCHEDULER_MODAL_ID)} title="Run scheduler / view history">
                        Scheduler
                        {schedulerFailed && <span className="w-1.5 h-1.5 rounded-full bg-error ml-1" />}
                    </button>
                )}

                {showDataIntegrity && (
                    <button className="btn btn-sm rounded-box btn-secondary" onClick={() => showModal(DATA_INTEGRITY_MODAL_ID)}>
                        Data Integrity
                        <TabBadge count={dataIntegrityCount} tone="warning" />
                    </button>
                )}

                {!readOnly && missingPartCount > 0 && (
                    <button className="btn btn-sm btn-warning" onClick={() => onOpenMissingParts()}>
                        Missing parts ({missingPartCount})
                    </button>
                )}
            </div>
        </div>
    );
}

/** Second toolbar row: package tabs on the left; line switch, search, idle-machine toggle on the right. */
export function PlanTabsBar({
    tabs,
    activeTab,
    onOpenPickupPool,
    onTabChange,
    location,
    locationDisabled,
    onLocationChange,
    onOpenSearch,
    idleCount,
    showAllIdle,
    onToggleIdle,
}) {
    return (
        <div className="flex flex-wrap justify-between items-baseline gap-2">
            <ScrollableTabs items={tabs} active={activeTab} onChange={onTabChange} storageKey="loadingPlan:packageTabs:active" />

            <div className="flex items-end gap-2">
                <fieldset className="fieldset rounded-box px-2">
                    <legend className="fieldset-legend text-[11px] px-1">Production Line</legend>
                    <div className="join h-2 items-center">
                        {PRODUCTION_LINES.map((line) => (
                            <button
                                key={line}
                                type="button"
                                disabled={locationDisabled}
                                onClick={() => onLocationChange(line)}
                                className={clsx(
                                    "btn btn-xs join-item",
                                    location === line ? "btn-primary" : "btn-dash opacity-60",
                                    interactiveCursorClasses(locationDisabled),
                                )}
                            >
                                {line}
                            </button>
                        ))}
                    </div>
                </fieldset>

                {onOpenPickupPool && (
                    <button
                        type="button"
                        className={clsx("btn btn-sm btn-outline", interactiveCursorClasses(locationDisabled))}
                        disabled={locationDisabled}
                        onClick={onOpenPickupPool}
                        title="Bring older F1/F2 pickups into this date's Unassigned"
                    >
                        Earlier pickups
                    </button>
                )}

                <button className="btn btn-sm z-50" onClick={onOpenSearch}>
                    <BsSearch size={16} />
                </button>

                {idleCount > 0 && (
                    <fieldset className="fieldset bg-base-100 border-base-300 rounded-box border py-1 px-2">
                        <legend className="fieldset-legend text-[11px] px-1">Idle machines</legend>
                        <label className="h-2 label gap-2 text-[11px] text-base-content/60 cursor-pointer">
                            <input type="checkbox" className="toggle toggle-xs" checked={showAllIdle} onChange={onToggleIdle} />
                            Show {idleCount} idle machine{idleCount !== 1 ? "s" : ""}
                        </label>
                    </fieldset>
                )}
            </div>
        </div>
    );
}