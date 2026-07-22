import { forwardRef, useMemo, useRef, useState } from "react";
import MachineChipClasses from "./MachineChipClasses";
const PLATFORM_ORDER = ["G6L", "Vitrox", "HSI"];

function MachineChipButton({ machine, disabled, onClick }) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => onClick(machine)}
            className={MachineChipClasses(disabled ? "disabled" : "idle")}
            title={machine ?? "Unassigned"}
        >
            {machine ?? "Unassigned"}
        </button>
    );
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

const TransferModal = forwardRef(function TransferModal(
    { machines, machinePlatform, selectedMachines, onSelect, onClose },
    ref,
) {
    const [query, setQuery] = useState("");

    const { pseudoMachines, realMachines } = useMemo(() => {
        const pseudo = [];
        const real = [];
        for (const m of machines) {
            (m === null || m === "MANUAL" ? pseudo : real).push(m);
        }
        return { pseudoMachines: pseudo, realMachines: real };
    }, [machines]);

    const filteredReal = useMemo(() => {
        if (!query.trim()) return realMachines;
        const q = query.toLowerCase();
        return realMachines.filter((m) => m.toLowerCase().includes(q));
    }, [realMachines, query]);

    const grouped = useMemo(
        () => groupByPlatform(filteredReal, machinePlatform),
        [filteredReal, machinePlatform],
    );

    const isDisabled = (m) =>
        selectedMachines.size === 1 && selectedMachines.has(m);

    return (
        <dialog ref={ref} id="transfer_modal" className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-3xl max-h-[80vh] flex flex-col">
                <h3 className="font-bold text-lg mb-3">Transfer to…</h3>

                <input
                    autoFocus
                    type="text"
                    placeholder="Search machine…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="input input-sm input-bordered w-full mb-3"
                />

                <div className="overflow-y-auto flex-1">
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                        {pseudoMachines.map((m) => (
                            <MachineChipButton
                                key={m ?? "unassigned"}
                                machine={m}
                                disabled={isDisabled(m)}
                                onClick={(machine) => {
                                    onSelect(machine);
                                    ref.current?.close();
                                }}
                            />
                        ))}
                    </div>

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
                                                onClick={(machine) => {
                                                    onSelect(machine);
                                                    ref.current?.close();
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn btn-ghost" onClick={onClose}>
                            Cancel
                        </button>
                    </form>
                </div>
            </div>

            {/* click-outside-to-close, matches your add_block_modal pattern */}
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
});

export default TransferModal;
