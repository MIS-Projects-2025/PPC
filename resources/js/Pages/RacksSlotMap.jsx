import CancellableActionButton from "@/Components/CancellableActionButton";
import { useLotActions } from "@/Hooks/useLotActions";
import { useLotStore } from "@/Store/useLotStore";
import formatPastDateTimeLabel from "@/Utils/formatPastDateTimeLabel";
import { router } from "@inertiajs/react";
import clsx from "clsx";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

// --- helpers ---
function parseLabel(label) {
    const m = label.match(/^([A-Z]+)(\d+)$/);
    return m ? { row: m[1], col: parseInt(m[2]) } : null;
}

function buildTransposedGrid(slots) {
    const slotMap = {};
    const rowSet = new Set();
    const colSet = new Set();

    slots.forEach((s) => {
        const p = parseLabel(s.label);
        if (!p) return;
        slotMap[s.label] = s;
        rowSet.add(p.row);
        colSet.add(p.col);
    });

    const rows = [...rowSet].sort();
    const cols = [...colSet].sort((a, b) => a - b);
    return { rows, cols, slotMap };
}

// --- sub-components ---
function LotChip({ productionLine, lot }) {
    console.log("🚀 ~ LotChip ~ lot:", lot);
    const [hovered, setHovered] = useState(false);
    const { openReleaseDialog, mutateLotCancel } =
        useContext(LotActionsContext);
    const isLoading = useLotStore((s) => s.lotMutations[lot.lot_id]?.isLoading);

    return (
        <div
            className="relative h-full"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <button
                type="button"
                className="btn btn-ghost w-full h-full font-medium"
                onClick={() => {
                    router.visit(
                        route("lot-upstream.index", {
                            productionLine: productionLine?.name,
                        }),
                        {
                            data: { search: lot?.lot_id },
                        },
                    );
                }}
            >
                <span className="block font-mono text-md leading-snug px-1 py-0.5 rounded text-base-content break-all">
                    {lot.lot_id}
                </span>
            </button>

            <div
                className={clsx(
                    "absolute left-full z-20 top-1/2 -translate-y-1/2 flex transition-all duration-200 ease-out",
                    {
                        "opacity-100 translate-x-0 pointer-events-auto":
                            hovered,
                        "opacity-0 -translate-x-2 pointer-events-none":
                            !hovered,
                    },
                )}
            >
                <CancellableActionButton
                    abort={() => mutateLotCancel(lot?.lot_id ?? null)}
                    refetch={async () => {
                        openReleaseDialog(lot); // ← instead of releaseLot + router.reload
                    }}
                    buttonClassName="btn btn-sm btn-primary"
                    loading={isLoading}
                    buttonText="Release"
                    loadingMessage="Releasing..."
                />
            </div>
        </div>
    );
}

function SlotCell({ productionLine, slot }) {
    const lots =
        slot?.active_positions?.map((p) => p.lot).filter(Boolean) ?? [];
    const isFull = slot?.is_manually_full ?? false;

    const fullClass = isFull ? "ring ring-red-500 bg-red-500" : "";

    if (!slot) {
        return (
            <div
                className={clsx(
                    "w-32 min-h-7 rounded ring ring-dashed ring-base-content/10 bg-base-200/30",
                    fullClass,
                )}
            />
        );
    }

    if (lots.length === 0) {
        return (
            <div
                className={clsx(
                    "w-32 min-h-7 rounded ring ring-base-content/10 bg-base-200/40",
                    fullClass,
                )}
            />
        );
    }

    return (
        <div
            className={clsx(
                "w-32 min-h-7 rounded ring ring-amber-400 bg-base-200 p-0.5 flex flex-col gap-0.5",
                fullClass,
            )}
        >
            {lots.map((lot) => (
                <LotChip
                    productionLine={productionLine}
                    key={lot.lot_id}
                    lot={lot}
                />
            ))}
        </div>
    );
}

function RackCard({ productionLine, rack }) {
    const { rows, cols, slotMap } = buildTransposedGrid(rack.slots);
    const totalSlots = rack.slots.length;
    const occupiedSlots = rack.slots.filter(
        (s) => s.active_positions.length > 0,
    ).length;
    const totalLots = rack.slots.reduce(
        (acc, s) => acc + s.active_positions.length,
        0,
    );

    return (
        <div className="bg-base-100 border border-base-content/10 rounded-lg">
            {/* header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-base-content/10 sticky top-0 z-20 bg-base-100">
                <span className="font-mono text-sm font-medium">
                    {rack.label}
                </span>
                <span className="text-xs text-base-content/40">
                    {occupiedSlots}/{totalSlots} slots · {totalLots} lots
                </span>
            </div>

            <div className="overflow-auto max-h-[500px]">
                <table className="border-separate border-spacing-1">
                    <thead>
                        <tr>
                            <th className="sticky top-0 left-0 z-20 bg-base-100 w-5" />
                            {rows.map((row) => (
                                <th
                                    key={row}
                                    className="sticky top-0 z-10 bg-base-100 w-[3.75rem] font-mono text-lg text-base-content font-normal text-center"
                                >
                                    {row}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {cols.map((colNum) => (
                            <tr key={colNum}>
                                <td className="sticky left-0 z-10 bg-base-100 w-5 font-mono text-lg text-base-content text-right align-top pt-1.5">
                                    {colNum}
                                </td>
                                {rows.map((row) => {
                                    const label = row + String(colNum);
                                    return (
                                        <td key={label} className="align-top">
                                            <SlotCell
                                                productionLine={productionLine}
                                                slot={slotMap[label]}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="bg-base-200/60 text-center rounded-lg px-3 py-2.5 flex-1">
            <div className="text-xl font-medium">{value}</div>
            <div className="text-[11px] text-base-content/40 mt-0.5">
                {label}
            </div>
        </div>
    );
}

const LiveTimeLabel = ({ timestamp }) => {
    const [, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 10000);
        return () => clearInterval(interval);
    }, []);

    return <span>{formatPastDateTimeLabel(timestamp)}</span>;
};

const LotActionsContext = createContext(null);

export default function RacksSlotMap({ productionLine, slotMap: racks }) {
    const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
    const { releaseLot, mutateLotCancel } = useLotActions();
    const [lotToBeReleased, setLotToBeReleased] = useState(null);
    const withdrawerIdInputRef = useRef(null);
    const dialogRef = useRef(null);
    const { lotMutations, setWithdrawerId, withdrawerId } = useLotStore();

    const load = useCallback(async () => {
        setLastRefreshTime(Date.now());

        router.reload({
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    const stats = racks.reduce(
        (acc, rack) => {
            acc.slots += rack.slots.length;
            rack.slots.forEach((s) => {
                if (s.active_positions.length > 0) acc.occupied++;
                acc.lots += s.active_positions.length;
            });
            return acc;
        },
        { slots: 0, occupied: 0, lots: 0 },
    );

    const openReleaseDialog = useCallback((lot) => {
        setLotToBeReleased(lot);
        dialogRef.current?.showModal();
        setTimeout(() => withdrawerIdInputRef.current?.focus(), 50);
    }, []);

    const handleRelease = useCallback(async () => {
        await releaseLot(lotToBeReleased);
        dialogRef.current?.close();
        router.reload({ preserveState: true, preserveScroll: true });
    }, [lotToBeReleased, withdrawerId]);

    return (
        <LotActionsContext.Provider
            value={{ openReleaseDialog, mutateLotCancel }}
        >
            <div className="min-h-screen">
                {/* toolbar */}
                <div className="flex items-start justify-between gap-4">
                    <div className="fle w-50 flex-col items-center">
                        <div className="text-xl font-medium uppercase tracking-widest text-base-content">
                            <span>{productionLine?.name}</span> Slot map
                        </div>
                        <div className="flex flex-1 justify-between items-center gap-1">
                            {lastRefreshTime && (
                                <div className="flex text-xs text-base-content/30 font-mono flex-col">
                                    <div className="">
                                        updated{" "}
                                        {new Date(
                                            lastRefreshTime,
                                        ).toLocaleTimeString()}
                                    </div>
                                    <LiveTimeLabel
                                        timestamp={lastRefreshTime}
                                    />
                                </div>
                            )}
                            <button
                                className="btn btn-xs btn-ghost border border-base-content/10"
                                onClick={load}
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between flex-1 gap-1 mb-5">
                        <StatCard label="Racks" value={racks.length} />
                        <StatCard label="Total slots" value={stats.slots} />
                        <StatCard label="Occupied" value={stats.occupied} />
                        <StatCard label="Lots placed" value={stats.lots} />
                    </div>
                </div>

                <div className="grid grid-cols-1">
                    {racks.map((rack) => (
                        <RackCard
                            productionLine={productionLine}
                            key={rack.id}
                            rack={rack}
                        />
                    ))}
                </div>

                <dialog ref={dialogRef} className="modal z-50">
                    <div className="modal-box w-3/12 border border-base-content/50 max-w-[calc(100vw-4rem)]">
                        <h3 className="font-bold text-lg text-center mb-4">
                            Scan or Enter Withdrawer ID
                        </h3>
                        <div className="flex flex-col w-full h-full justify-center items-center">
                            <div className="w-full">
                                Releasing{" "}
                                <span className="badge badge-primary badge-sm">
                                    {lotToBeReleased?.lot_id}
                                </span>
                            </div>
                            <div className="w-full mb-4">
                                Leave the withdrawer id empty if you forgot it.
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
                                        mutateLotCancel(
                                            lotToBeReleased?.lot_id ?? null,
                                        )
                                    }
                                    refetch={handleRelease}
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
            </div>
        </LotActionsContext.Provider>
    );
}
