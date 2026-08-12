import { useMemo, useState } from "react";
import MachineChipClasses from "./MachineChipClasses";

const PLATFORM_ORDER = ["G6L", "Vitrox", "HSI"];

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

function MachineChipButton({ machine, disabled, selected, onClick }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onClick(machine)}
            className={`${MachineChipClasses(
                disabled ? "disabled" : selected ? "active" : "idle",
            )} ${disabled ? "" : "cursor-pointer"}`}
            title={machine ?? "Unassigned"}
        >
            {machine ?? "Unassigned"}
        </button>
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
    isDisabled = () => false,
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
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {pseudoMachines.map((m) => (
                        <MachineChipButton
                            key={m ?? "unassigned"}
                            machine={m}
                            disabled={isDisabled(m)}
                            selected={selectedMachine === m}
                            onClick={handleSelect}
                        />
                    ))}
                </div>
            )}

            {grouped.length === 0 ? (
                <div className="text-center text-xs text-base-content/40 py-8">
                    No machines match "{query}"
                </div>
            ) : (
                <div className="space-y-3">
                    {grouped.map(([platform, group]) => (
                        <div key={platform}>
                            <div className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wide mb-1">
                                {platform}
                            </div>
                            <div className="grid grid-cols-6 gap-1.5">
                                {group.map((m) => (
                                    <MachineChipButton
                                        key={m}
                                        machine={m}
                                        disabled={isDisabled(m)}
                                        selected={selectedMachine === m}
                                        onClick={handleSelect}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
