import { MACHINE_MANUAL } from "@/Constants/machines.js";
import { isNonMachineKey } from "@/Hooks/LoadingPlan/useNonMachineOperations";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import clsx from "clsx";
import { memo, useCallback, useContext, useDeferredValue, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TableInteractionContext } from "./MachineHeaderBar";
// these five need an `export` added in MachineSelectionGrid.jsx
import { TIER_LABELS, TIER_STYLES, groupByPlatform, groupByTier, platformStyle } from "./MachineSelectionGrid";

// ── formatting ───────────────────────────────────────────────────────────
const fmtTime = (t, offset = 0) => {
    if (!t) return "—";
    if (!offset) return t;
    return `${t} ${offset > 0 ? "+" : "−"}${Math.abs(offset)}d`;
};
const num = (n) => (Number(n) || 0).toLocaleString();

const STRIPES = "repeating-linear-gradient(45deg, rgba(255,255,255,0.45) 0 3px, transparent 3px 6px)";
// off-screen preview rows skip layout/paint, which keeps long lanes cheap to swap
const LAZY_ROW = { contentVisibility: "auto", containIntrinsicSize: "auto 24px" };

// ── data ─────────────────────────────────────────────────────────────────
/** One pass: machine -> { rows, lots, end }. Rows being transferred are left out (they get appended). */
function buildLaneIndex(allData, movingIds) {
    const lanes = new Map();
    for (const r of allData) {
        if (r.machine == null || movingIds.has(r.id)) continue;
        let lane = lanes.get(r.machine);
        if (!lane) lanes.set(r.machine, (lane = { rows: [], lots: 0, end: null }));
        lane.rows.push(r);
        if (!isBlockRow(r)) lane.lots += 1;
        if (r.time_end) lane.end = { time: r.time_end, offset: r.time_end_day_offset ?? 0 };
    }
    return lanes;
}

// ── commit bar ───────────────────────────────────────────────────────────
/**
 * Solid = commit today, striped = added by this transfer, red = beyond capacity.
 * The bar's full width is max(projected, capacity); a tick marks capacity once it is exceeded.
 */
function CommitBar({ cur, add, cap, className = "h-1.5" }) {
    if (!cap) return <div className={clsx("rounded-full bg-base-content/10", className)} />;

    const proj = cur + add;
    const scale = Math.max(proj, cap);
    const within = Math.min(cur, cap);
    const addWithin = Math.max(0, Math.min(proj, cap) - within);
    const curOver = Math.max(0, cur - cap);
    const addOver = Math.max(0, proj - Math.max(cur, cap));
    const w = (v) => `${(v / scale) * 100}%`;

    return (
        <div className={clsx("relative flex overflow-hidden rounded-full bg-base-content/10", className)}>
            <div className={cur / cap > 0.85 ? "bg-warning" : "bg-lime-500"} style={{ width: w(within) }} />
            <div className="bg-info" style={{ width: w(addWithin), backgroundImage: STRIPES }} />
            <div className="bg-error" style={{ width: w(curOver) }} />
            <div className="bg-error" style={{ width: w(addOver), backgroundImage: STRIPES }} />
            {proj > cap && <span className="absolute inset-y-0 w-px bg-base-content" style={{ left: w(cap) }} />}
        </div>
    );
}

// ── left side: one machine per row ───────────────────────────────────────
const MachineRow = memo(function MachineRow({ item, selected, disabled, onPick, onPreview }) {
    const { machine, label, lots, addLots, end, cur, add, cap, compat } = item;
    const pct = cap ? Math.round(((cur + add) / cap) * 100) : null;

    return (
        <button
            type="button"
            aria-pressed={selected}
            aria-disabled={disabled}
            title={disabled ? "The selected rows are already on this machine" : undefined}
            onClick={() => {
                if (!disabled) onPick(machine);
            }}
            onPointerEnter={() => onPreview(machine)}
            onFocus={() => onPreview(machine)}
            className={clsx(
                "grid w-full grid-cols-[6.5rem_3.5rem_5.5rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1 text-left text-xs",
                selected ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-base-content/10 focus-visible:bg-base-content/10",
                disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
            )}
        >
            <span className="flex min-w-0 items-center gap-1">
                <span className="truncate font-medium">{label}</span>
                {compat && <span className="badge badge-warning badge-xs shrink-0">{compat}</span>}
            </span>

            <span className="tabular-nums">
                {lots}
                {addLots > 0 && <span className="text-info"> +{addLots}</span>}
            </span>

            <span className="tabular-nums text-base-content/70">{fmtTime(end?.time, end?.offset)}</span>

            <span className="min-w-0">
                <span className="mb-0.5 flex justify-between font-mono text-[10px] leading-none">
                    <span>
                        {cap ? num(cur) : "no capacity"}
                        {cap && add > 0 && <span className="text-info"> +{num(add)}</span>}
                    </span>
                    {pct != null && <span className={pct > 100 ? "font-bold text-error" : "text-base-content/60"}>{pct}%</span>}
                </span>
                <CommitBar cur={cur} add={add} cap={cap} />
            </span>
        </button>
    );
});

const QuickChip = memo(function QuickChip({ machine, label, selected, disabled, onPick, onPreview }) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            aria-disabled={disabled}
            onClick={() => {
                if (!disabled) onPick(machine);
            }}
            onPointerEnter={() => onPreview(machine)}
            onFocus={() => onPreview(machine)}
            className={clsx("btn btn-sm", selected ? "btn-primary" : "btn-outline", disabled && "cursor-not-allowed opacity-40")}
        >
            {label}
        </button>
    );
});

function ListHeader() {
    return (
        <div className="grid grid-cols-[6.5rem_3.5rem_5.5rem_minmax(0,1fr)] gap-2 px-2 pb-1 text-[10px] text-base-content/50">
            <span>Machine</span>
            <span>Lots</span>
            <span>Ends</span>
            <span>Commit</span>
        </div>
    );
}

// ── right side: read-only lane ───────────────────────────────────────────
function LaneRow({ row, incoming = false }) {
    const block = isBlockRow(row);
    return (
        <div
            style={LAZY_ROW}
            className={clsx(
                "grid h-6 grid-cols-[5rem_5rem_minmax(0,1fr)_7rem_3.5rem] items-center gap-2 border-b border-base-content/5 px-3 text-xs",
                block && "border-l-2 border-l-warning bg-warning/10",
                incoming && "border-l-2 border-l-info bg-info/10",
            )}
        >
            {/* an incoming row still carries its OLD machine's times: don't show them */}
            <span className="tabular-nums text-base-content/70">{incoming ? "—" : fmtTime(row.time_start, row.time_start_day_offset)}</span>
            <span className="tabular-nums text-base-content/70">{incoming ? "—" : fmtTime(row.time_end, row.time_end_day_offset)}</span>
            <span className="truncate">{block ? `▨ ${row.block_label}` : row.part_name}</span>
            <span className="truncate font-mono">{block ? "" : row.lot_id}</span>
            <span className="text-right tabular-nums">{block ? "" : num(row.qty)}</span>
        </div>
    );
}

function PreviewMessage({ children }) {
    return <div className="flex h-full items-center justify-center px-6 text-center text-sm text-base-content/50">{children}</div>;
}

const LanePreview = memo(function LanePreview({ machine, item, lane, incoming, incomingLots, isSelected }) {
    const scrollRef = useRef(null);

    // the new rows land at the bottom, so that's where the eye should start
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [machine, lane, incoming]);

    if (machine === undefined) return <PreviewMessage>Hover a machine to preview its lane.</PreviewMessage>;
    if (machine === null) {
        return <PreviewMessage>Unassigned has no timeline. The rows go back to the Unassigned pool.</PreviewMessage>;
    }
    if (!item) return null;

    const { label, cur, add, cap, end } = item;
    const rows = lane?.rows ?? [];
    const pct = cap ? Math.round(((cur + add) / cap) * 100) : null;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b border-base-content/10 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold">{label}</span>
                    <span className={clsx("badge badge-sm", isSelected ? "badge-primary" : "badge-ghost")}>
                        {isSelected ? "Selected" : "Preview — click to select"}
                    </span>
                </div>

                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                    <span>
                        Ends <b className="tabular-nums">{fmtTime(end?.time, end?.offset)}</b>
                    </span>
                    <span>
                        <b className="tabular-nums">{item.lots}</b> lots
                        {incomingLots > 0 && <span className="text-info"> +{incomingLots}</span>}
                    </span>
                    {cap ? (
                        <span className="font-mono">
                            {num(cur)}
                            <span className="text-info"> +{num(add)}</span> / {num(cap)}{" "}
                            <span className={pct > 100 ? "font-bold text-error" : ""}>({pct}%)</span>
                        </span>
                    ) : (
                        <span className="text-base-content/50">no capacity set</span>
                    )}
                </div>

                <CommitBar cur={cur} add={add} cap={cap} className="mt-1.5 h-2.5" />
                <div className="mt-1 flex gap-3 text-[10px] text-base-content/50">
                    <span>▬ commit now</span>
                    <span>▨ added by this transfer</span>
                    <span>red = over capacity</span>
                </div>
            </div>

            <div className="grid shrink-0 grid-cols-[5rem_5rem_minmax(0,1fr)_7rem_3.5rem] gap-2 border-b border-base-content/10 px-3 py-1 text-[10px] text-base-content/50">
                <span>Start</span>
                <span>End</span>
                <span>Part</span>
                <span>Lot</span>
                <span className="text-right">Qty</span>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                {rows.length === 0 && <div className="px-3 py-3 text-xs text-base-content/40">This lane is empty.</div>}
                {rows.map((r) => (
                    <LaneRow key={r.id} row={r} />
                ))}

                {incoming.length > 0 && (
                    <>
                        <div className="border-b border-info/30 bg-base-300 px-3 py-1 text-[11px] font-semibold text-info">
                            Incoming: {incoming.length} row{incoming.length !== 1 ? "s" : ""}, added to the end. Times are set when you confirm.
                        </div>
                        {incoming.map((r) => (
                            <LaneRow key={r.id} row={r} incoming />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
});

// ── picker ───────────────────────────────────────────────────────────────
export default function TransferMachinePicker({
    machines,
    nonMachines = [],
    machinePlatform,
    selectedMachine, // undefined = nothing picked yet, null = Unassigned
    onSelect,
    isDisabled,
    candidates, // transfer-candidates response indexed by machine, or null
    loading,
    incomingRows, // the rows being transferred
    laneRows, // every row in the plan
    inputRef,
}) {
    const { machineCapacity, machineTotalDoable } = useContext(TableInteractionContext);
    const [query, setQuery] = useState("");
    const [previewMachine, setPreviewMachine] = useState(undefined);

    // Last hovered machine stays on the right, so the user can move over and scroll it.
    const shown = previewMachine !== undefined ? previewMachine : selectedMachine;
    const deferredShown = useDeferredValue(shown); // list highlight stays instant, the lane renders just behind it

    const handlePick = useCallback(
        (m) => {
            setPreviewMachine(m);
            onSelect(m);
        },
        [onSelect],
    );
    const handlePreview = useCallback((m) => setPreviewMachine(m), []);

    const cands = loading ? null : candidates;
    const inTransferMode = cands !== null && cands !== undefined;

    const movingIds = useMemo(() => new Set(incomingRows.map((r) => r.id)), [incomingRows]);
    const incomingLots = useMemo(() => incomingRows.filter((r) => !isBlockRow(r)).length, [incomingRows]);
    const lanes = useMemo(() => buildLaneIndex(laneRows, movingIds), [laneRows, movingIds]);

    const realMachines = useMemo(() => machines.filter((m) => m !== null && m !== MACHINE_MANUAL), [machines]);
    const hasManual = machines.includes(MACHINE_MANUAL);

    // one summary per machine; identity only changes when its inputs do, so memoised rows skip re-rendering on hover
    const itemMap = useMemo(() => {
        const make = (m, label) => {
            const cand = cands?.[m];
            const capRaw = Number(cand?.capacity ?? machineCapacity?.[m]?.capacity);
            const cur = Number(cand?.current_doable ?? machineTotalDoable?.[m] ?? 0) || 0;
            const lane = lanes.get(m);
            const total = (cand?.compatible_lot_ids?.length ?? 0) + (cand?.incompatible_lot_ids?.length ?? 0);

            return {
                machine: m,
                label,
                cap: capRaw > 0 ? capRaw : null,
                cur,
                add: cand ? Math.max(0, (Number(cand.projected_doable) || 0) - cur) : 0,
                lots: lane?.lots ?? 0,
                addLots: incomingLots,
                end: lane?.end ?? null,
                tier: cand?.tier ?? 5,
                compat:
                    cand && cand.tier !== 5 && cand.incompatible_lot_ids?.length > 0
                        ? `${cand.compatible_lot_ids.length}/${total}`
                        : null,
            };
        };

        const map = new Map();
        realMachines.forEach((m) => map.set(m, make(m, m)));
        nonMachines.forEach((n) => map.set(n.key, make(n.key, n.name)));
        if (hasManual) map.set(MACHINE_MANUAL, make(MACHINE_MANUAL, "MANUAL"));
        return map;
    }, [cands, machineCapacity, machineTotalDoable, lanes, incomingLots, realMachines, nonMachines, hasManual]);

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const names = q ? realMachines.filter((m) => m.toLowerCase().includes(q)) : realMachines;
        const grouped = inTransferMode ? groupByTier(names, cands) : groupByPlatform(names, machinePlatform);

        return grouped.map(([key, list]) => ({
            key,
            style: inTransferMode ? TIER_STYLES[key] : platformStyle(key),
            label: inTransferMode ? TIER_LABELS[key] : key,
            items: list.map((m) => itemMap.get(m)),
        }));
    }, [query, realMachines, inTransferMode, cands, machinePlatform, itemMap]);

    const nonMachineItems = useMemo(() => {
        const q = query.trim().toLowerCase();
        return nonMachines.filter((n) => !q || n.name.toLowerCase().includes(q)).map((n) => itemMap.get(n.key));
    }, [nonMachines, query, itemMap]);

    const selectedTier =
        inTransferMode && selectedMachine != null && selectedMachine !== MACHINE_MANUAL && !isNonMachineKey(selectedMachine)
            ? (cands[selectedMachine]?.tier ?? 5)
            : null;

    const row = (item) => (
        <MachineRow
            key={item.machine}
            item={item}
            selected={selectedMachine === item.machine}
            disabled={!!isDisabled?.(item.machine)}
            onPick={handlePick}
            onPreview={handlePreview}
        />
    );

    return (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(26rem,32rem)_minmax(0,1fr)] gap-3">
            {/* machines */}
            <div className="flex min-h-0 flex-col">
                <div className="relative mb-2">
                    <input
                        ref={inputRef}
                        autoFocus
                        type="text"
                        placeholder="Search machine…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="input input-sm input-bordered w-full"
                    />
                    {loading && <span className="loading loading-spinner loading-xs absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40" />}
                </div>

                {selectedTier === 5 && (
                    <div role="alert" className="alert alert-warning alert-soft mb-2 px-3 py-2 text-xs">
                        <span>
                            <span className="font-bold">{selectedMachine}</span> is incompatible with the lots being transferred. You can still
                            assign it. Or if you think the rule is wrong, you can edit it here.
                        </span>
                    </div>
                )}

                <div
                    aria-busy={loading}
                    className={clsx("min-h-0 flex-1 overflow-y-auto pr-1 transition-opacity", loading && "pointer-events-none opacity-50")}
                >
                    <div className="mb-3 flex flex-wrap gap-1.5 border-b border-dashed border-base-content/10 pb-3">
                        <QuickChip
                            machine={null}
                            label="Unassigned"
                            selected={selectedMachine === null}
                            disabled={!!isDisabled?.(null)}
                            onPick={handlePick}
                            onPreview={handlePreview}
                        />
                        {hasManual && (
                            <QuickChip
                                machine={MACHINE_MANUAL}
                                label="MANUAL"
                                selected={selectedMachine === MACHINE_MANUAL}
                                disabled={!!isDisabled?.(MACHINE_MANUAL)}
                                onPick={handlePick}
                                onPreview={handlePreview}
                            />
                        )}
                    </div>

                    <ListHeader />

                    {nonMachines.length > 0 && (
                        <div className="mb-3 border-b border-dashed border-base-content/10 pb-3">
                            <div className="mb-1 px-1 text-[10px] font-semibold text-base-content/40">Non-machines</div>
                            {nonMachineItems.length === 0 ? (
                                <div className="px-1 text-xs text-base-content/40">No non-machine matches "{query}"</div>
                            ) : (
                                nonMachineItems.map(row)
                            )}
                        </div>
                    )}

                    {groups.length === 0 && nonMachineItems.length === 0 ? (
                        <div className="py-8 text-center text-xs text-base-content/40">No machines match "{query}"</div>
                    ) : (
                        <div className="space-y-3">
                            {groups.map((g) => (
                                <div key={g.key} className={`rounded-lg border p-1.5 ${g.style.border} ${g.style.bg}`}>
                                    <div className="mb-1 flex items-center gap-1.5 px-1">
                                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${g.style.dot}`} />
                                        <span className={`text-[10px] font-bold ${g.style.text}`}>{g.label}</span>
                                        <span className="font-mono text-[9px] text-base-content/30">{g.items.length}</span>
                                        <div className={`h-px flex-1 border-t ${g.style.border}`} />
                                    </div>
                                    {g.items.map(row)}
                                </div>
                            ))}
                        </div>
                    )}

                    {nonMachines.length === 0 && (
                        <p className="mt-2 text-[11px] text-base-content/40">
                            No non-machines for this date and location yet. Create one from the Non-machines button.
                        </p>
                    )}
                </div>
            </div>

            {/* lane preview */}
            <div className="min-h-0 overflow-hidden rounded-lg border border-base-content/10 bg-base-200">
                <LanePreview
                    machine={deferredShown}
                    item={itemMap.get(deferredShown)}
                    lane={lanes.get(deferredShown)}
                    incoming={incomingRows}
                    incomingLots={incomingLots}
                    isSelected={deferredShown === selectedMachine && selectedMachine !== undefined}
                />
            </div>
        </div>
    );
}