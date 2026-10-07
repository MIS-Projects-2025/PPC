import { useState } from "react";

export const NON_MACHINES_MODAL_ID = "non_machines_modal";

export default function NonMachinesModal({
    nonMachines,
    rowCounts,
    location,
    date,
    disabled,
    onCreate,
    onRename,
    onDelete,
}) {
    const [name, setName] = useState("");

    const add = async () => {
        const n = name.trim();
        if (!n) return;
        if (await onCreate(n)) setName("");
    };

    return (
        <dialog id={NON_MACHINES_MODAL_ID} className="modal">
            <div className="modal-box bg-base-300 max-h-[80vh] flex flex-col">
                <h3 className="font-bold text-lg">Non-machines</h3>
                <p className="text-xs text-base-content/50 mb-3">
                    {location} · {date}. Names don't have to be unique. Empty ones are not shown in
                    the table; pick them as a target in the transfer list.
                </p>

                <div className="join w-full mb-4">
                    <input
                        className="input input-bordered join-item w-full"
                        placeholder="New non-machine name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && add()}
                    />
                    <button
                        className="btn btn-primary join-item"
                        disabled={disabled || !name.trim()}
                        onClick={add}
                    >
                        Add
                    </button>
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                    {nonMachines.length === 0 && (
                        <span className="text-sm text-base-content/50">None yet.</span>
                    )}
                    {nonMachines.map((n) => (
                        <div key={n.id} className="flex items-center gap-2">
                            <input
                                key={`${n.id}-${n.name}`}
                                className="input input-sm input-bordered flex-1"
                                defaultValue={n.name}
                                disabled={disabled}
                                onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if (v && v !== n.name) onRename(n.id, v);
                                    else e.target.value = n.name;
                                }}
                                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                            />
                            <span className="badge badge-ghost badge-sm font-mono whitespace-nowrap">
                                {rowCounts?.[n.key] ?? 0} rows
                            </span>
                            <button
                                className="btn btn-xs btn-error btn-outline"
                                disabled={disabled}
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            `Delete "${n.name}"? Its lots go back to Unassigned and its time blocks are deleted.`,
                                        )
                                    ) {
                                        onDelete(n.id);
                                    }
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>

                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn btn-ghost btn-sm">Close</button>
                    </form>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    );
}