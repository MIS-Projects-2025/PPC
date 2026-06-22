import CancellableActionButton from "@/Components/CancellableActionButton";
import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";
import useBarcodeScanner from "@/Hooks/useBarcodeScanner";
import { useLotActions } from "@/Hooks/useLotActions";
import { useToast } from "@/Hooks/useToast";
import { playNotification } from "@/Service/AudioService";
import { useLotStore } from "@/Store/useLotStore";
import formatLocalTime from "@/Utils/formatLocalTime";
import clsx from "clsx";
import { format, formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { FaDownload, FaPlus, FaUpload } from "react-icons/fa";
import RackManagement from "./Rack";

const RACK_SELECTION_ID = "lots_upstream_rack_selector_modal";
const WITHDRAWER_SELECTION_ID = "lots_upstream_withdrawer_selector_modal";

import LotRunTooltip from "@/Components/LotRunTooltip";
import Pagination from "@/Components/Pagination";
import SearchInput from "@/Components/SearchInput";
import { useDownloadFile } from "@/Hooks/useDownload";
import { parseLotScanInput } from "@/Lib/parseLotScanInput";
import { router } from "@inertiajs/react";
import { GrAscend, GrDescend } from "react-icons/gr";
import { TiArrowDownThick } from "react-icons/ti";

const RECEIVE = LOT_UPSTREAM_MODES.RECEIVE;
const RELEASE = LOT_UPSTREAM_MODES.RELEASE;

function SlotAssign() {
    const { slotPendingLot, removeSlotPendingLot } = useLotStore();

    return (
        <div className="py-2">
            <label className="block text-[10px] font-bold tracking-widest text-base-content uppercase">
                Rack slots
            </label>
            <div className="bg-base-200 border border-base-content/20 rounded-lg min-h-7 overflow-y-auto flex flex-wrap">
                {slotPendingLot.length === 0 && (
                    <div className="flex gap-2 w-full justify-center items-center opacity-50">
                        None assigned
                    </div>
                )}
                {slotPendingLot.map((s, i) => (
                    <div key={i} className="flex">
                        {s && (
                            <button
                                type="button"
                                onClick={() => removeSlotPendingLot(s.id)}
                                className="btn btn-sm btn-ghost group relative flex items-center gap-2 overflow-hidden hover:border hover:border-rose-500 hover:text-rose-500"
                            >
                                <span>{s?.label}</span>
                                <span className="scale-0 opacity-0 transition-all duration-100 group-hover:max-w-[50px] group-hover:scale-100 group-hover:text-rose-500 group-hover:opacity-100">
                                    ×
                                </span>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ScanPanel({ lotActions }) {
    const {
        pendingLotToBeAdded,
        isScanning,
        addPendingLot,
        editingLot,
        isEditMode,
        editPendingLotWithRawInput,
        slotPendingLot,
        lotMutations,
        // mode,
    } = useLotStore();
    const {
        focusedField,
        setFocusedField,
        editLot,
        confirmLot,
        isMutateLotLoading,
        mutateLotCancel,
    } = lotActions;
    const inputRefs = useRef({});
    const canConfirm = pendingLotToBeAdded?.lot_id?.trim();

    const handleConfirm = async () => {
        if (!pendingLotToBeAdded?.lot_id?.trim()) {
            return;
        }

        if (isEditMode) {
            editLot({
                ...pendingLotToBeAdded,
                qty: parseInt(pendingLotToBeAdded.qty) || 0,
                slot_ids: slotPendingLot.map((s) => s.id),
            });
        } else {
            addPendingLot({
                ...pendingLotToBeAdded,
                qty: parseInt(pendingLotToBeAdded.qty) || 0,
                slot_ids: slotPendingLot.map((s) => s.id),
            });
            await confirmLot();
        }

        lotActions.resetFocus();
    };

    useEffect(() => {
        if (focusedField && inputRefs.current[focusedField]) {
            // 1. Move focus to the specific field
            inputRefs.current[focusedField].focus();
        } else if (focusedField === null) {
            // 2. If we explicitly set focusedField to null,
            // remove focus from whatever is currently active.
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }
    }, [focusedField]);

    return (
        <div className="w-full flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-[13px] font-bold tracking-wide">
                        {isEditMode
                            ? `Edit ${pendingLotToBeAdded?.lot_id}`
                            : "Scan lot"}
                        {pendingLotToBeAdded?.status && (
                            <span
                                className={clsx("ml-2 badge badge-sm", {
                                    "badge-warning":
                                        pendingLotToBeAdded?.status ===
                                        "staged",
                                    "badge-success":
                                        pendingLotToBeAdded?.status ===
                                        "released",
                                })}
                            >
                                {pendingLotToBeAdded?.status}
                            </span>
                        )}
                    </h2>
                    {!isEditMode && (
                        <p className="text-[11px] text-base-content mt-0.5">
                            Scan QR or fill fields manually
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-px bg-base-200" />
                <div className="flex-1 h-px bg-base-200" />
            </div>

            {LOT_UPSTREAM_MODES.FIELD_ORDER.map((field) => (
                <div key={field}>
                    <label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1">
                        {field.replace("_", " ")}
                        {focusedField === field && (
                            <span className="ml-2 text-primary normal-case tracking-normal font-normal">
                                ← scanning here
                            </span>
                        )}
                    </label>
                    <input
                        ref={(el) => (inputRefs.current[field] = el)}
                        value={pendingLotToBeAdded[field] || ""}
                        className={clsx(
                            "input",
                            isScanning && focusedField === field
                                ? "animate-pulse"
                                : "",
                            focusedField === field ? "input-primary" : "",
                        )}
                        onChange={(e) =>
                            editPendingLotWithRawInput(field, e.target.value)
                        }
                        // Physical click as manual override — same as scanning FIELD:*
                        onFocus={(e) => {
                            setFocusedField(field);
                            e.target.select();
                        }}
                    />
                </div>
            ))}

            <SlotAssign />

            {isEditMode && pendingLotToBeAdded?.stagings?.length > 0 && (
                <div className="mb-4 flex flex-col flex-1 min-h-0">
                    <label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1">
                        Staging History
                    </label>
                    <div className="overflow-y-auto flex flex-col gap-1 pr-1 min-h-0">
                        {pendingLotToBeAdded.stagings.map((staging, index) => {
                            const isActive = !staging.released_at;
                            const isLast =
                                index ===
                                pendingLotToBeAdded.stagings.length - 1;
                            const withdrawer = staging.withdrawer;

                            const byRack = staging.positions.reduce(
                                (acc, pos) => {
                                    let rackLabel =
                                        pos.rack_slot?.rack?.label ?? "?";
                                    if (rackLabel.includes("__deleted__")) {
                                        rackLabel =
                                            "DELETED - " +
                                            rackLabel
                                                .replace("__deleted__", "")
                                                .trim();
                                    }

                                    if (!acc[rackLabel]) acc[rackLabel] = [];
                                    acc[rackLabel].push(pos);
                                    return acc;
                                },
                                {},
                            );

                            return (
                                <div
                                    key={staging.id}
                                    className="relative flex flex-col gap-1 flex-shrink-0"
                                >
                                    <div
                                        className={clsx(
                                            "w-full flex gap-2 px-2 py-1.5 rounded border text-[10px] font-bold tracking-wide",
                                            isActive
                                                ? "bg-base-100 border-orange-500/30 text-orange-700"
                                                : "bg-base-200/50 border-base-300 text-base-content/40",
                                        )}
                                    >
                                        <div className="w-1/2">
                                            <div className="flex items-center">
                                                <span
                                                    className={clsx(
                                                        "text-[8px] rounded",
                                                        isActive
                                                            ? "bg-orange-100 text-orange-600"
                                                            : "bg-base-300 text-base-content",
                                                    )}
                                                >
                                                    {isActive
                                                        ? "active"
                                                        : "released"}
                                                </span>
                                                <span className="ml-2 text-[10px]">
                                                    #{staging.cycle}
                                                </span>
                                            </div>

                                            {Object.entries(byRack).map(
                                                ([rackLabel, positions]) => (
                                                    <div
                                                        key={rackLabel}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <span>{rackLabel}</span>
                                                        <div className="opacity-50">
                                                            |
                                                        </div>
                                                        <span>
                                                            {positions.map(
                                                                (pos, i) => {
                                                                    // const deletedAt = pos.rack_slot?.deleted_at || pos.rack_slot?.rack?.deleted_at;
                                                                    return (
                                                                        <span
                                                                            key={
                                                                                pos.rack_slot_id
                                                                            }
                                                                        >
                                                                            {/* {deletedAt && <span className="text-[10px]">✕</span>} */}
                                                                            {
                                                                                pos
                                                                                    .rack_slot
                                                                                    ?.label
                                                                            }
                                                                            {i <
                                                                                positions.length -
                                                                                    1 &&
                                                                                ", "}
                                                                        </span>
                                                                    );
                                                                },
                                                            )}
                                                        </span>
                                                    </div>
                                                ),
                                            )}

                                            {staging?.partname && (
                                                <div>
                                                    partname: {staging.partname}
                                                </div>
                                            )}

                                            {staging?.qty && (
                                                <div>
                                                    quantity: {staging.qty}
                                                </div>
                                            )}
                                        </div>

                                        <table className="w-1/2 text-[10px] font-normal">
                                            <tbody>
                                                <tr>
                                                    <td>staged</td>
                                                    <td className="text-right">
                                                        {staging.staged_by} ·{" "}
                                                        {formatLocalTime(
                                                            staging.staged_at,
                                                        )}
                                                    </td>
                                                </tr>
                                                {staging.released_at && (
                                                    <tr>
                                                        <td>released</td>
                                                        <td className="text-right">
                                                            {
                                                                staging.released_by
                                                            }{" "}
                                                            ·{" "}
                                                            {formatLocalTime(
                                                                staging.released_at,
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                                {withdrawer && (
                                                    <tr>
                                                        <td>withdrawn</td>
                                                        <td className="text-right">
                                                            {
                                                                withdrawer.FIRSTNAME
                                                            }{" "}
                                                            ·{" "}
                                                            {
                                                                withdrawer.EMPLOYID
                                                            }
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {!isLast && (
                                        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-base-content/40 z-10 text-[20px] text-center leading-0">
                                            <TiArrowDownThick />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <CancellableActionButton
                abort={mutateLotCancel}
                refetch={handleConfirm}
                disabled={!canConfirm}
                loading={lotMutations[pendingLotToBeAdded?.lot_id]?.isLoading}
                buttonText={isEditMode ? "Save changes" : "Confirm receive"}
                loadingMessage={isEditMode ? "Saving..." : "Receiving..."}
            />
        </div>
    );
}

function LastRunBadge({ latestRun }) {
    if (!latestRun?.end_time) return null;

    const absolute = format(new Date(latestRun.end_time), "MMM d, yyyy h:mm a");

    return (
        <>
            <span
                data-tooltip-id={`run-${latestRun.id}`}
                className="cursor-pointer text-[10px] font-semibold rounded bg-primary text-base-content border border-primary px-1.5 py-0.5 cursor-default"
            >
                ✓ Completed: {absolute}
            </span>
            <LotRunTooltip id={`run-${latestRun.id}`} latestRun={latestRun} />
        </>
    );
}

function ReceivedList({ onEdit, lotActions }) {
    const { lots, lastAddedId, recentUpdates, lotMutations, setMode } =
        useLotStore();
    const { mutateLotCancel, isMutateLotLoading, releaseLotWithdrawerPrompt } =
        lotActions;

    return (
        <div className="bg-base-100 h-[calc(100vh-240px)] border shadow-md border-base-300 rounded-xl overflow-hidden flex flex-col">
            <div
                className="overflow-y-auto mt-2"
                style={{ maxHeight: "calc(100vh - 260px)" }}
            >
                {lots.length === 0 ? (
                    <div className="py-12 text-center text-[12px] text-base-content">
                        No lots found
                    </div>
                ) : (
                    lots.map((lot, idx) => {
                        const recentUpdate = recentUpdates[lot.id];
                        const lastStaging =
                            lot.stagings?.[lot.stagings.length - 1];

                        return (
                            <div
                                key={lot.id}
                                className={clsx(
                                    "group relative flex items-start justify-between px-4 py-1 gap-3 border-b border-base-300 last:border-none hover:bg-base-200 transition-colors",
                                    recentUpdate && "animate-updated",
                                    idx % 2 === 0 && "bg-base-200/50",
                                    lot.id === lastAddedId &&
                                        "animate-new-item",
                                )}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[13px] antialiased font-jet-brains font-bold truncate">
                                                {lot.lot_id}
                                            </p>
                                            <p className="text-[11px] antialiased font-jet-brains text-base-content truncate">
                                                {lot.partname}
                                            </p>
                                            <span className="text-[10px] font-semibold rounded bg-base-200 text-base-content border border-base-300">
                                                {Number(
                                                    lot.qty ?? 0,
                                                ).toLocaleString()}{" "}
                                                quantity
                                            </span>
                                            <LastRunBadge
                                                latestRun={
                                                    lot?.latest_run || null
                                                }
                                            />
                                            {recentUpdate && (
                                                <div className="flex items-center gap-0 ml-1">
                                                    {/* arrow */}
                                                    <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-base-300" />
                                                    <div className="bg-base-300 text-base-content text-[11px] px-2 py-0.5 rounded-sm whitespace-nowrap">
                                                        {recentUpdate?.user ||
                                                            "System"}{" "}
                                                        {recentUpdate?.action ||
                                                            "did something on"}{" "}
                                                        this
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-1.5 flex-wrap mt-1.5 items-center">
                                            {(lot.stagings ?? []).map(
                                                (staging, index) => {
                                                    const isActive =
                                                        !staging.released_at;
                                                    const isLast =
                                                        index ===
                                                        lot.stagings.length - 1;

                                                    const byRack =
                                                        staging.positions.reduce(
                                                            (acc, pos) => {
                                                                let rackLabel =
                                                                    pos
                                                                        .rack_slot
                                                                        ?.rack
                                                                        ?.label ??
                                                                    "?";
                                                                if (
                                                                    rackLabel.includes(
                                                                        "__deleted__",
                                                                    )
                                                                ) {
                                                                    rackLabel =
                                                                        "DELETED - " +
                                                                        rackLabel
                                                                            .replace(
                                                                                "__deleted__",
                                                                                "",
                                                                            )
                                                                            .trim();
                                                                }

                                                                if (
                                                                    !acc[
                                                                        rackLabel
                                                                    ]
                                                                )
                                                                    acc[
                                                                        rackLabel
                                                                    ] = [];
                                                                acc[
                                                                    rackLabel
                                                                ].push({
                                                                    ...pos,
                                                                    isDeleted:
                                                                        !!pos
                                                                            .rack_slot
                                                                            ?.deleted_at,
                                                                });
                                                                return acc;
                                                            },
                                                            {},
                                                        );

                                                    return (
                                                        <div
                                                            key={staging.id}
                                                            className="flex items-center gap-1"
                                                        >
                                                            <div
                                                                className={`flex flex-col gap-0.5 px-1.5 py-1 rounded border text-[10px] font-bold tracking-wide
																				${
                                                                                    isActive
                                                                                        ? "bg-base-100 border-orange-500/30 text-orange-700"
                                                                                        : "bg-base-200 border-base-300 text-base-content/40"
                                                                                }`}
                                                            >
                                                                <div className="flex justify-between">
                                                                    <div className="text-[8px] opacity-60">
                                                                        #
                                                                        {
                                                                            staging.cycle
                                                                        }
                                                                    </div>
                                                                </div>
                                                                {Object.entries(
                                                                    byRack,
                                                                ).map(
                                                                    ([
                                                                        rackLabel,
                                                                        positions,
                                                                    ]) => (
                                                                        <div
                                                                            key={
                                                                                rackLabel
                                                                            }
                                                                            className="flex items-center gap-1"
                                                                        >
                                                                            <span>
                                                                                {
                                                                                    rackLabel
                                                                                }
                                                                            </span>
                                                                            <div className="opacity-50">
                                                                                |
                                                                            </div>
                                                                            <span>
                                                                                {positions.map(
                                                                                    (
                                                                                        pos,
                                                                                        i,
                                                                                    ) => {
                                                                                        // const deletedAt = pos.rack_slot?.deleted_at || pos.rack_slot?.rack?.deleted_at;
                                                                                        return (
                                                                                            <span
                                                                                                key={
                                                                                                    pos.rack_slot_id
                                                                                                }
                                                                                            >
                                                                                                {/* {deletedAt && <span className="text-[8px] opacity-75 text-rose-500">DELETED</span>} */}
                                                                                                {
                                                                                                    pos
                                                                                                        .rack_slot
                                                                                                        ?.label
                                                                                                }
                                                                                                {i <
                                                                                                    positions.length -
                                                                                                        1 &&
                                                                                                    ", "}
                                                                                            </span>
                                                                                        );
                                                                                    },
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>

                                                            {!isLast && (
                                                                <div className="text-base-content/30 text-[10px]">
                                                                    ⮞
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <div className="flex flex-col items-end gap-1">
                                        <div
                                            className={clsx(
                                                "badge badge-xs",
                                                lot.status === "released"
                                                    ? "badge-success"
                                                    : "badge-warning",
                                            )}
                                        >
                                            {lot.status}
                                        </div>
                                        <span className="text-[10px] text-base-content font-mono">
                                            {formatLocalTime(
                                                lot.released_at ??
                                                    lot.received_at,
                                            )}{" "}
                                            by{" "}
                                            {lot.released_at
                                                ? lot?.released_by?.FIRSTNAME
                                                : lot?.received_by?.FIRSTNAME}
                                        </span>
                                        {lot.released_at &&
                                            lastStaging?.withdrawer && (
                                                <span className="text-[10px] text-base-content font-mono">
                                                    to{" "}
                                                    {
                                                        lastStaging.withdrawer
                                                            .FIRSTNAME
                                                    }
                                                </span>
                                            )}
                                    </div>
                                    <div className="absolute p-3 backdrop-blur-xs top-1/2 -translate-y-1/2 right-0 hidden group-hover:flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMode(RECEIVE);
                                                onEdit(lot);
                                            }}
                                            className="btn btn-sm btn-secondary"
                                        >
                                            Edit
                                        </button>
                                        {!lot.released_at && (
                                            <CancellableActionButton
                                                abort={() =>
                                                    mutateLotCancel(lot.lot_id)
                                                }
                                                refetch={() => {
                                                    releaseLotWithdrawerPrompt(
                                                        lot,
                                                    );
                                                }}
                                                loading={
                                                    lotMutations[lot.lot_id]
                                                        ?.isLoading
                                                }
                                                buttonText="Release"
                                                buttonClassName="btn-sm btn-primary"
                                                loadingMessage="Releasing..."
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default function LotsUpstream({
    lots: received,
    totalEntries,
    totalReceived: serverTotalReceived,
    totalReleased: serverTotalReleased,
    racks = null,
    occupancy,
    filters: serverFilters,
    productionLine,
    productionLineId,
}) {
    const toast = useToast();
    const lotActions = useLotActions();
    const {
        initialize,
        isScanning,
        addPendingLot,
        totalReceived,
        totalReleased,
        setTotalReleased,
        setTotalReceived,
        incrementTotalReceived,
        incrementTotalReleased,
        updateLot,
        mode,
        setMode,
        setEditingLot,
        withdrawerId,
        setWithdrawerId,
        setSlots,
        lotToBeReleased,
        toggleSlotPendingLot,
        setIsEditMode,
        editPendingLot,
        scanResult,
        setScanResult,
        receiveLot,
        appendRecentUpdate,
        pendingLotToBeAdded,
        lotMutations,
        removePendingLot,
        clearSlotPendingLot,
        clearRecentUpdate,
        slotPendingLot,
    } = useLotStore();

    const [filters, setFilters] = useState({
        search: serverFilters.search ?? "",
        status: serverFilters.status ?? "",
        received_date_from: serverFilters.received_date_from ?? "",
        received_date_to: serverFilters.received_date_to ?? "",
        released_date_from: serverFilters.released_date_from ?? "",
        released_date_to: serverFilters.released_date_to ?? "",
        aging: serverFilters.aging ?? false,
        unslotted: serverFilters.unslotted ?? false,
        sort: serverFilters.sort ?? "asc",
        restocked: serverFilters.restocked ?? false,
    });

    const rackSelectionDialogRef = useRef(null);
    const withdrawerDialogRef = useRef(null);
    const withdrawerIdInputRef = useRef(null);

    const set = (key, val) => setFilters((prev) => ({ ...prev, [key]: val }));

    const apply = (overrides = {}) => {
        if (
            overrides instanceof Event ||
            typeof overrides !== "object" ||
            Array.isArray(overrides)
        ) {
            overrides = {};
        }

        const merged = { ...filters, ...overrides };
        const params = Object.fromEntries(
            Object.entries(merged).filter(([, v]) => v !== "" && v !== false),
        );
        // const params = Object.fromEntries(
        //     Object.entries(filters).filter(([, v]) => v !== "" && v !== false),
        // );
        router.get(
            route("lot-upstream.index", { productionLine: productionLine }),
            params,
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const {
        download: downloadLots,
        isLoading: isDownloading,
        errorMessage,
        abort: abortDownload,
    } = useDownloadFile();

    const download = async () => {
        const params = Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v !== "" && v !== false),
        );

        try {
            downloadLots(
                route("api.download.downloadLots", {
                    productionLine: productionLine,
                }),
                params,
            );
        } catch (error) {
            toast.error(error?.message);
            console.error(error);
        }
    };

    const resetFilters = () => {
        setFilters({
            search: "",
            status: "",
            received_date_from: "",
            received_date_to: "",
            released_date_from: "",
            released_date_to: "",
            aging: false,
            unslotted: false,
            sort: "asc",
            restocked: false,
        });
    };

    useEffect(() => {
        initialize(received.data);
        setTotalReceived(serverTotalReceived);
        setTotalReleased(serverTotalReleased);
    }, [received]);

    useEffect(() => {
        if (mode === LOT_UPSTREAM_MODES.RECEIVE) {
            playNotification(LOT_UPSTREAM_MODES.RECEIVE);
        } else if (mode === LOT_UPSTREAM_MODES.RELEASE) {
            playNotification(LOT_UPSTREAM_MODES.RELEASE);
        }
    }, [mode]);

    useEffect(() => {
        if (!scanResult.status) return;

        if (scanResult.status === LOT_UPSTREAM_MODES.OPEN_WITHDRAWAL) {
            document.getElementById(WITHDRAWER_SELECTION_ID)?.showModal();

            // Push the focus to the next tick of the event loop
            setTimeout(() => {
                withdrawerIdInputRef.current?.focus();
            }, 50);

            return;
        }

        if (scanResult.status === LOT_UPSTREAM_MODES.OPEN) {
            // lotActions.resetFocus();
            document.getElementById(RACK_SELECTION_ID)?.showModal();
            return;
        }

        if (scanResult.status === LOT_UPSTREAM_MODES.CLOSE) {
            document.getElementById(RACK_SELECTION_ID)?.close();
            return;
        }

        if (scanResult.status === LOT_UPSTREAM_MODES.RECEIVE_SUCCESS) {
            playNotification(LOT_UPSTREAM_MODES.SUCCESS);
            document.getElementById(RACK_SELECTION_ID)?.close();
            document.getElementById(WITHDRAWER_SELECTION_ID)?.close();
            return;
        }

        if (scanResult.status === LOT_UPSTREAM_MODES.SUCCESS) {
            playNotification(LOT_UPSTREAM_MODES.SUCCESS);
        } else if (scanResult.status === LOT_UPSTREAM_MODES.WRONG) {
            playNotification(LOT_UPSTREAM_MODES.WRONG);
        }
    }, [scanResult]);

    const handleEdit = (lot) => {
        setIsEditMode(true);
        setEditingLot(lot);

        clearSlotPendingLot();
        Object.values(lot.slots).forEach((slot) => {
            toggleSlotPendingLot(slot);
        });

        document.getElementById(RACK_SELECTION_ID)?.showModal();
    };

    useBarcodeScanner((currentBuffer, e) => {
        if (e.target?.dataset?.noScanner !== undefined) return;

        const text = currentBuffer.replace(/^\([^)]*\)/gm, "");
        console.log("🚀 ~ LotsUpstream ~ regex:", text);
        const parsed = parseLotScanInput(text);
        const type = parsed.type;

        if (
            type !== LOT_UPSTREAM_MODES.TYPE_FIELD_VALUE &&
            lotActions.focusedField
        ) {
            const current = pendingLotToBeAdded[lotActions.focusedField] ?? "";
            editPendingLot(lotActions.focusedField, current.slice(0, -1));
        }

        if (
            type === LOT_UPSTREAM_MODES.TYPE_SLOT ||
            type === LOT_UPSTREAM_MODES.TYPE_COMMAND
        ) {
            e.preventDefault();
            e.stopPropagation();
        }

        lotActions.handleScanParsed(parsed);
    });

    const handleSelectFromRack = useCallback((slot) => {
        toggleSlotPendingLot(slot);
    }, []);

    const selectedSlotIds = useMemo(
        () => new Set(slotPendingLot.map((s) => s.id)),
        [slotPendingLot],
    );

    useEffect(() => {
        const channel = window.Echo.channel(`lot-updates.${productionLineId}`);
        // const channel = window.Echo.channel("lot-updates");

        channel.listen("LotChanged", (e) => {
            const action = e?.action ?? "did something on ";
            const id = e?.id ?? null;
            const data = e?.data ?? null;

            const receivedBy = e?.data?.received_by?.FIRSTNAME ?? "someone";
            const modifiedBy = e?.data?.modified_by?.FIRSTNAME ?? "someone";
            const releasedBy = e?.data?.released_by?.FIRSTNAME ?? "someone";

            let mutator = "someone";
            if (action === "created") {
                mutator = receivedBy;
                receiveLot({
                    ...e.data,
                });
                incrementTotalReceived();
                appendRecentUpdate(e.id, mutator, action);
                setTimeout(() => clearRecentUpdate(e.id), 5000);
            } else if (action === "updated" || action === "released") {
                mutator = action === "released" ? releasedBy : modifiedBy;
                incrementTotalReleased();
                updateLot(e.id, e.data);
                appendRecentUpdate(e.id, mutator, action);
                setTimeout(() => clearRecentUpdate(e.id), 5000);
            }

            if (!id || !data) return;

            toast.info(`${mutator} ${action} ${data?.lot_id}`, {
                duration: 10000,
                position: "top-left",
            });
        });

        return () => window.Echo.leave("lot-updates");
    }, []);

    const goToPage = (page) => {
        router.reload({
            data: {
                page,
            },
            preserveState: true,
            preserveScroll: true,
        });
    };

    useEffect(() => {
        const dialog = withdrawerDialogRef.current;
        if (!dialog) return;

        const handleClose = () => {
            setIsEditMode(false);
        };

        dialog.addEventListener("close", handleClose);
        return () => dialog.removeEventListener("close", handleClose);
    }, []);

    useEffect(() => {
        const dialog = rackSelectionDialogRef.current;
        if (!dialog) return;

        const handleClose = () => {
            lotActions.resetFocus();
            setScanResult(LOT_UPSTREAM_MODES.CLOSE);
            setIsEditMode(false);
        };

        dialog.addEventListener("close", handleClose);
        return () => dialog.removeEventListener("close", handleClose);
    }, []);

    return (
        <div className="bg-base-200 font-mono">
            <Toaster position="top-left" />

            <dialog
                ref={rackSelectionDialogRef}
                id={WITHDRAWER_SELECTION_ID}
                className="modal z-50"
            >
                <div className="modal-box w-3/12 border border-base-content/50 max-w-[calc(100vw-4rem)]">
                    <h3 className="font-bold text-lg text-center mb-4">
                        Scan or Enter Withdrawer ID
                    </h3>
                    {/* <Toaster position="top-left" /> */}

                    <div className="flex flex-col w-full h-full justify-center items-center">
                        <div className="w-full mb-4">
                            Releasing{" "}
                            <span className="badge badge-primary badge-sm">
                                {lotToBeReleased?.lot_id}
                            </span>
                        </div>
                        <div className="flex gap-2 justify-between">
                            <input
                                type="text"
                                ref={withdrawerIdInputRef}
                                autoFocus
                                placeholder="Employee ID"
                                className="input"
                                value={withdrawerId}
                                onChange={(e) =>
                                    setWithdrawerId(
                                        e.target.value.replace(/^0+/, ""),
                                    )
                                }
                                data-no-scanner
                                onFocus={(e) => e.target.select()}
                            />

                            <CancellableActionButton
                                abort={() =>
                                    lotActions.mutateLotCancel(
                                        lotToBeReleased?.lot_id ?? null,
                                    )
                                }
                                refetch={() => {
                                    lotActions.releaseLot(lotToBeReleased);
                                }}
                                loading={
                                    lotMutations[
                                        lotToBeReleased?.lot_id ?? null
                                    ]?.isLoading
                                }
                                buttonText="Release"
                                loadingMessage="Releasing..."
                            />
                        </div>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>

            <dialog
                ref={rackSelectionDialogRef}
                id={RACK_SELECTION_ID}
                className="modal z-50"
            >
                <div className="modal-box w-11/12 border border-base-content/50 max-w-[calc(100vw-4rem)] h-[calc(100vh-4.5rem)] overflow-hidden p-0">
                    <Toaster position="top-left" />

                    <div className="flex w-full h-full">
                        <div className="w-8/12">
                            <RackManagement
                                racks={racks}
                                occupancy={occupancy}
                                selectedSlotIds={selectedSlotIds}
                                initialDetailedView={false}
                                multiSelect={true}
                                disableSideDetailPanel
                                onSlotSelect={handleSelectFromRack}
                            />
                        </div>

                        <div className="w-0.5 h-full bg-base-content/25"></div>

                        <div className="w-4/12 p-4">
                            <ScanPanel lotActions={lotActions} />
                        </div>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>

            <div className="flex flex-col gap-4 overflow-hidden rounded-lg p-2">
                <div className="flex items-center gap-2">
                    <div
                        className={clsx(
                            "text-7xl font-extrabold text-shadow-lg",
                            {
                                "text-error": mode === RELEASE,
                                "text-secondary": mode === RECEIVE,
                            },
                        )}
                    >
                        {productionLine}
                    </div>
                    <fieldset
                        className={clsx(
                            "fieldset bg-base-100 border-base-300 shadow-lg rounded-box w-64 border px-4 py-2",
                            {
                                "border-error shadow-error": mode === RELEASE,
                                "border-secondary shadow-secondary":
                                    mode === RECEIVE,
                            },
                        )}
                    >
                        <legend className="fieldset-legend leading-0 mb-1 text-xl">
                            Scanner Mode
                        </legend>
                        <label className="label">
                            <input
                                type="checkbox"
                                checked={mode === RELEASE}
                                className={clsx("toggle", {
                                    "toggle-error": mode === RELEASE,
                                    "toggle-secondary": mode === RECEIVE,
                                })}
                                onChange={() =>
                                    setMode(
                                        mode === RELEASE ? RECEIVE : RELEASE,
                                    )
                                }
                            />
                            <div
                                className={clsx(
                                    "flex w-full items-center justify-between gap-2 text-xl font-extrabold letter-spacing-2",
                                    {
                                        "text-error": mode === RELEASE,
                                        "text-secondary": mode === RECEIVE,
                                    },
                                )}
                            >
                                <span className="tracking-[.2em]">
                                    {mode === RELEASE
                                        ? "RELEASING"
                                        : "RECEIVING"}
                                </span>
                                <span>
                                    {mode === RELEASE ? (
                                        <FaUpload className="w-5 h-5" />
                                    ) : (
                                        <FaDownload className="w-5 h-5" />
                                    )}
                                </span>
                            </div>
                        </label>
                    </fieldset>

                    <div className="flex-1 border-base-300 flex flex-wrap gap-2 items-center">
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                className={clsx(
                                    "btn btn-primary border-2 h-full rounded-sm",
                                    isScanning
                                        ? "border-success shadow-success"
                                        : "border-transparent",
                                )}
                                onClick={() => {
                                    removePendingLot();
                                    clearSlotPendingLot();
                                    setMode(RECEIVE);
                                    document
                                        .getElementById(RACK_SELECTION_ID)
                                        ?.showModal();
                                }}
                            >
                                Add Lot <FaPlus />
                            </button>
                            <SearchInput
                                initialSearchInput={filters.search}
                                onSearchChange={(searchInput) =>
                                    set("search", searchInput)
                                }
                                onEnter={apply}
                                inputClassName="w-50 ml-0 rounded-sm"
                                data-no-scanner
                                onFocus={(e) => e.target.select()}
                            />
                        </div>

                        <fieldset
                            className={clsx(
                                "fieldset border-base-300 rounded-box w-28 border p-0",
                            )}
                        >
                            <legend className="fieldset-legend font-light leading-0 text-xs">
                                Released Date
                            </legend>
                            <label className="flex flex-col label">
                                <div className="flex items-center">
                                    <div className="w-8 text-right">from</div>
                                    <input
                                        type="date"
                                        value={filters.released_date_from}
                                        onChange={(e) =>
                                            set(
                                                "released_date_from",
                                                e.target.value,
                                            )
                                        }
                                        className="input input-sm text-[12px] bg-transparent rounded-md"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <div className="w-8 text-right">to</div>
                                    <input
                                        type="date"
                                        value={filters.released_date_to}
                                        onChange={(e) =>
                                            set(
                                                "released_date_to",
                                                e.target.value,
                                            )
                                        }
                                        className="input input-sm text-[12px] bg-transparent rounded-md"
                                    />
                                </div>
                            </label>
                        </fieldset>

                        <fieldset
                            className={clsx(
                                "fieldset border-base-300 rounded-box w-28 border p-0",
                            )}
                        >
                            <legend className="fieldset-legend font-light leading-0 text-xs">
                                Received Date
                            </legend>
                            <label className="flex flex-col label">
                                <div className="flex items-center">
                                    <div className="w-8 text-right">from</div>
                                    <input
                                        type="date"
                                        value={filters.received_date_from}
                                        onChange={(e) =>
                                            set(
                                                "received_date_from",
                                                e.target.value,
                                            )
                                        }
                                        className="input input-sm text-[12px] bg-transparent rounded-md"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <div className="w-8 text-right">to</div>
                                    <input
                                        type="date"
                                        value={filters.received_date_to}
                                        onChange={(e) =>
                                            set(
                                                "received_date_to",
                                                e.target.value,
                                            )
                                        }
                                        className="input input-sm text-[12px] bg-transparent rounded-md"
                                    />
                                </div>
                            </label>
                        </fieldset>

                        <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="checkbox checked:checkbox-primary checkbox-xs"
                                    checked={filters.aging}
                                    onChange={(e) =>
                                        set("aging", e.target.checked)
                                    }
                                />
                                <span className="text-[12px]">Aging ≥3d</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="checkbox checked:checkbox-primary checkbox-xs"
                                    checked={filters.unslotted}
                                    onChange={(e) =>
                                        set("unslotted", e.target.checked)
                                    }
                                />
                                <span className="text-[12px]">Unslotted</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="checkbox checked:checkbox-primary checkbox-xs"
                                    checked={filters.restocked}
                                    onChange={(e) =>
                                        set("restocked", e.target.checked)
                                    }
                                />
                                <span className="text-[12px]">Restocked</span>
                            </label>
                        </div>

                        <div className="flex flex-col items-end">
                            <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() =>
                                    set(
                                        "sort",
                                        filters.sort === "asc" ? "desc" : "asc",
                                    )
                                }
                            >
                                {filters.sort === "asc" ? (
                                    <GrAscend />
                                ) : (
                                    <GrDescend />
                                )}
                                {filters.sort === "asc"
                                    ? "oldest first"
                                    : "newest first"}
                            </button>

                            <button
                                type="button"
                                className="btn btn-sm"
                                popoverTarget="status-select"
                                style={{
                                    anchorName: "--anchor-status-select",
                                }}
                            >
                                {filters.status || "All Status"}
                            </button>

                            <ul
                                className="dropdown menu w-52 rounded-box bg-base-100 shadow-sm"
                                popover="auto"
                                id="status-select"
                                style={{
                                    positionAnchor: "--anchor-status-select",
                                }}
                            >
                                <li onClick={() => set("status", null)}>
                                    <a>All Status</a>
                                </li>
                                <li onClick={() => set("status", "staged")}>
                                    <a>Staged</a>
                                </li>
                                <li onClick={() => set("status", "released")}>
                                    <a>Released</a>
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-1 items-end ml-auto">
                            <button
                                type="button"
                                onClick={() => apply()}
                                className="btn w-36 rounded-sm btn-xs btn-primary text-[12px]"
                            >
                                Apply filters
                            </button>
                            <CancellableActionButton
                                abort={abortDownload}
                                refetch={download}
                                // disabled={!}
                                loading={isDownloading}
                                buttonText={"Download this data"}
                                loadingMessage={"Downloading..."}
                                buttonClassName="btn-sm btn-primary rounded-sm"
                            />
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="btn btn-xs rounded-sm btn-ghost text-[12px]"
                            >
                                reset filters
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-w-0 overflow-y-auto">
                    <div className="flex gap-6">
                        <div className="flex gap-2 items-center">
                            <div className="flex gap-1 opacity-50">Today</div>
                            <div className="flex gap-1">
                                <span className="opacity-50">received</span>{" "}
                                <span>{totalReceived}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="opacity-50">released</span>{" "}
                                <span>{totalReleased}</span>
                            </div>
                        </div>
                        <Pagination
                            links={received.links}
                            currentPage={received?.current_page}
                            goToPage={goToPage}
                            filteredTotal={received?.total}
                            overallTotal={totalEntries}
                            start={received?.from}
                            end={received?.to}
                            contentClassName={"m-0 p-0"}
                        />
                    </div>
                    <ReceivedList onEdit={handleEdit} lotActions={lotActions} />
                </div>
            </div>
        </div>
    );
}
