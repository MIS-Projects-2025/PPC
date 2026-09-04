import { useContext, useMemo, useState } from "react";
import HoverCell from "./HoverCell";
import MachineChipClasses from "./MachineChipClasses";
import { TableInteractionContext } from "./MachineHeaderBar";

const PLATFORM_ORDER = ["G6L", "Vitrox", "HSI"];

// Accent styling per platform — used for group headers, dividers, and
// (subtly) the exceeded/warning ring on chips stays semantic (error/warning)
// regardless of platform, so these only touch neutral/branding chrome.
const PLATFORM_STYLES = {
    G6L: {
        dot: "bg-sky-400",
        text: "text-sky-500",
        border: "border-sky-400/30",
        bg: "bg-sky-400/[0.04]",
    },
    Vitrox: {
        dot: "bg-violet-400",
        text: "text-violet-500",
        border: "border-violet-400/30",
        bg: "bg-violet-400/[0.04]",
    },
    HSI: {
        dot: "bg-amber-400",
        text: "text-amber-500",
        border: "border-amber-400/30",
        bg: "bg-amber-400/[0.04]",
    },
    Other: {
        dot: "bg-base-content/30",
        text: "text-base-content/40",
        border: "border-base-content/10",
        bg: "bg-base-content/[0.02]",
    },
};

function platformStyle(platform) {
    return PLATFORM_STYLES[platform] ?? PLATFORM_STYLES.Other;
}

function groupByPlatform(machineNames, machinePlatform) {
    const groups = new Map();
    for (const m of machineNames) {
        const platform = machinePlatform.get(m) ?? "Other";
        if (!groups.has(platform)) groups.set(platform, []);
        groups.get(platform).push(m);
    }
    return [...groups.entries()].sort(
        ([a], [b]) =>
            (PLATFORM_ORDER.indexOf(a) === -1
                ? 99
                : PLATFORM_ORDER.indexOf(a)) -
            (PLATFORM_ORDER.indexOf(b) === -1 ? 99 : PLATFORM_ORDER.indexOf(b)),
    );
}

/**
 * A single machine chip. For real machines (not pseudo-entries like
 * "Unassigned" / "MANUAL"), renders a thin capacity-utilization bar along
 * the bottom edge — mirroring the doable/capacity bar in MachineHeaderBar —
 * and a hover tooltip with the exact numbers.
 */
function MachineChipButton({ machine, selected, onClick, isPseudo }) {
    const { machineCapacity, machineTotalDoable } = useContext(
        TableInteractionContext,
    );

    const capacityData = !isPseudo ? machineCapacity?.[machine] : null;
    const CAPACITY = capacityData?.capacity ?? 0;
    const doable = machineTotalDoable?.[machine] ?? 0;
    const hasCapacity = !isPseudo && CAPACITY > 0;

    const pct = hasCapacity ? Math.min((doable / CAPACITY) * 100, 100) : 0;
    const isExceeded = hasCapacity && doable > CAPACITY;
    const isWarning = hasCapacity && !isExceeded && pct > 85;

    const barColor = isExceeded
        ? "bg-error"
        : isWarning
        ? "bg-warning"
        : "bg-lime-400";

    const button = (
        <button
            type="button"
            onClick={() => onClick(machine)}
            title={hasCapacity ? undefined : machine ?? "Unassigned"}
            className={`relative w-full overflow-hidden rounded-md ${MachineChipClasses(
                selected ? "active" : "idle",
            )} ${"cursor-pointer"} ${
                isExceeded ? "ring-1 ring-error ring-inset" : ""
            }`}
        >
            <span className="relative z-10">{machine ?? "Unassigned"}</span>

            {hasCapacity && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-base-content/10">
                    <span
                        className={`block h-full ${barColor} transition-[width] duration-300 ease-out`}
                        style={{ width: `${pct}%` }}
                    />
                </span>
            )}
        </button>
    );

    if (!hasCapacity) return button;

    return (
        <HoverCell trigger={button}>
            <div className="text-xs font-mono space-y-1.5 min-w-[150px] text-left">
                <div className="font-bold text-primary pb-0.5 border-b border-neutral-content/15">
                    {machine}
                </div>
                <div className="flex text-base-100 justify-between items-center gap-3">
                    <span className="opacity-70">Doable:</span>
                    <span className="font-semibold">
                        {doable.toLocaleString()}
                    </span>
                </div>
                <div className="flex text-base-100 justify-between items-center gap-3">
                    <span className="opacity-70">Capacity:</span>
                    <span className="font-semibold">
                        {CAPACITY.toLocaleString()}
                    </span>
                </div>
                <div
                    className={`flex justify-between items-center gap-3 border-t border-neutral-content/15 pt-1 ${
                        isExceeded
                            ? "text-error"
                            : isWarning
                            ? "text-warning"
                            : ""
                    }`}
                >
                    <span className="opacity-70">Utilization:</span>
                    <span className="font-bold">{pct.toFixed(0)}%</span>
                </div>
            </div>
        </HoverCell>
    );
}

/** Machine entries that aren't real machine names — rendered separately,
 *  above the grouped/searchable grid (e.g. "Unassigned" / manual entry). */
function isPseudoMachine(m) {
    return m === null || m === "MANUAL";
}

/**
 * Shared searchable, grouped-by-platform machine picker.
 *
 * - `machines`: full list of entries, including any pseudo entries (null /
 *    "MANUAL"). The grid splits these out internally — callers don't need
 *    to pre-split them.
 * - `selectedMachine`: the machine currently highlighted (controlled by parent,
 *    or left uncontrolled via `defaultSelectedMachine` if the parent doesn't care).
 * - `onSelect(machine)`: fired whenever a chip is clicked. Parent decides whether
 *    that's a final confirm (old TransferModal behavior) or just an update to
 *    `selectedMachine` (SplitModal-style, confirm happens later via a button).
 * - `isDisabled(machine)`: optional predicate for graying out chips.
 */
export default function MachineSelectionGrid({
    machines,
    machinePlatform,
    selectedMachine: selectedMachineProp,
    defaultSelectedMachine = null,
    onSelect,
    searchPlaceholder = "Search machine…",
}) {
    const [query, setQuery] = useState("");
    const [internalSelected, setInternalSelected] = useState(
        defaultSelectedMachine,
    );

    const { pseudoMachines, realMachines } = useMemo(() => {
        const pseudo = [];
        const real = [];
        for (const m of machines) {
            (isPseudoMachine(m) ? pseudo : real).push(m);
        }
        return { pseudoMachines: pseudo, realMachines: real };
    }, [machines]);

    // Controlled if parent passes selectedMachine, otherwise track internally.
    const selectedMachine =
        selectedMachineProp !== undefined
            ? selectedMachineProp
            : internalSelected;

    const handleSelect = (machine) => {
        if (selectedMachineProp === undefined) setInternalSelected(machine);
        onSelect?.(machine);
    };

    const filteredMachines = useMemo(() => {
        if (!query.trim()) return realMachines;
        const q = query.toLowerCase();
        return realMachines.filter((m) => m.toLowerCase().includes(q));
    }, [realMachines, query]);

    const grouped = useMemo(
        () => groupByPlatform(filteredMachines, machinePlatform),
        [filteredMachines, machinePlatform],
    );

    return (
        <div>
            <input
                autoFocus
                type="text"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input input-sm input-bordered w-full mb-3"
            />

            {pseudoMachines.length > 0 && (
                <div className="mb-3 pb-3 border-b border-dashed border-base-content/10">
                    <div className="text-[10px] font-semibold text-base-content/30 uppercase tracking-wide mb-1.5">
                        Quick select
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                        {pseudoMachines.map((m) => (
                            <MachineChipButton
                                key={m ?? "unassigned"}
                                machine={m}
                                isPseudo
                                selected={selectedMachine === m}
                                onClick={handleSelect}
                            />
                        ))}
                    </div>
                </div>
            )}

            {grouped.length === 0 ? (
                <div className="text-center text-xs text-base-content/40 py-8">
                    No machines match "{query}"
                </div>
            ) : (
                <div className="space-y-4">
                    {grouped.map(([platform, group]) => {
                        const style = platformStyle(platform);
                        return (
                            <div
                                key={platform}
                                className={`rounded-lg border ${style.border} ${style.bg} p-2`}
                            >
                                <div className="flex items-center gap-1.5 mb-2 px-0.5">
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`}
                                    />
                                    <span
                                        className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}
                                    >
                                        {platform}
                                    </span>
                                    <span className="text-[9px] text-base-content/30 font-mono">
                                        {group.length}
                                    </span>
                                    <div
                                        className={`flex-1 h-px ${style.border} border-t`}
                                    />
                                </div>
                                <div className="grid grid-cols-6 gap-1.5">
                                    {group.map((m) => (
                                        <MachineChipButton
                                            key={m}
                                            machine={m}
                                            selected={selectedMachine === m}
                                            onClick={handleSelect}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}