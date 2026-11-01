import clsx from "clsx";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

/** Small "add something to a machine" forms. Each opens with ref.current.open(machine). */

// ── Add time block ───────────────────────────────────────────────────────
const BLOCK_PRESETS = {
    setup: { label: "Setup", duration: 120 },
    config: { label: "Config", duration: 240 },
    conversion: { label: "Conversion", duration: 360 },
};

/** `onSave(machine, label, durationMinutes)` -> Promise */
export const AddBlockModal = forwardRef(function AddBlockModal({ disabled, onSave }, ref) {
    const dialogRef = useRef(null);
    const [machine, setMachine] = useState(null);
    const [option, setOption] = useState("setup");
    const [customLabel, setCustomLabel] = useState("");
    const [customDuration, setCustomDuration] = useState("60");

    useImperativeHandle(ref, () => ({
        open(m) {
            setOption("setup");
            setCustomLabel("");
            setCustomDuration("60");
            setMachine(m);
            dialogRef.current?.showModal();
        },
    }));

    const confirm = () => {
        let label;
        let duration;
        if (option === "custom") {
            label = customLabel.trim();
            duration = parseInt(customDuration, 10);
            if (!label || !duration || duration <= 0) return;
        } else {
            ({ label, duration } = BLOCK_PRESETS[option]);
        }
        onSave(machine, label, duration)
            .then(() => dialogRef.current?.close())
            .catch(() => {}); // the caller already toasted
    };

    const isCustom = option === "custom";

    return (
        <dialog ref={dialogRef} id="deemo_add_block_modal" className="modal">
            <div className="modal-box bg-base-300">
                <h3 className="font-bold text-lg mb-4">Add Time Block</h3>

                <div className="join join-vertical w-full mb-3">
                    {Object.entries(BLOCK_PRESETS).map(([key, preset]) => (
                        <button
                            key={key}
                            type="button"
                            className={clsx("btn justify-between join-item", option === key && "btn-primary")}
                            onClick={() => setOption(key)}
                            disabled={disabled}
                        >
                            {preset.label}
                            <span className="text-xs opacity-70 ml-1">{preset.duration / 60}hr</span>
                        </button>
                    ))}
                    <button
                        type="button"
                        className={clsx("btn join-item", isCustom && "btn-primary")}
                        onClick={() => setOption("custom")}
                        disabled={disabled}
                    >
                        Custom
                    </button>
                </div>

                <div className={clsx("join w-full transition-opacity", isCustom ? "opacity-100" : "opacity-0 pointer-events-none")}>
                    <input
                        type="text"
                        placeholder="Label"
                        className="input w-2/3 join-item input-bordered"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        tabIndex={isCustom ? 0 : -1}
                    />
                    <input
                        type="number"
                        placeholder="Duration in minutes"
                        className="input join-item input-bordered w-1/3"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        tabIndex={isCustom ? 0 : -1}
                    />
                </div>

                <div className="modal-action">
                    <form method="dialog"><button className="btn btn-ghost mr-2">Cancel</button></form>
                    <button className="btn btn-primary" disabled={disabled} onClick={confirm}>Add Block</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
});

// ── Add manual lot ───────────────────────────────────────────────────────
/** `onSave(machine, { partName, packageName, qty })` -> Promise */
export const AddLotModal = forwardRef(function AddLotModal({ disabled, onSave }, ref) {
    const dialogRef = useRef(null);
    const [machine, setMachine] = useState(null);
    const [part, setPart] = useState("");
    const [pkg, setPkg] = useState("");
    const [qty, setQty] = useState("");

    useImperativeHandle(ref, () => ({
        open(m) {
            setPart("");
            setPkg("");
            setQty("");
            setMachine(m);
            dialogRef.current?.showModal();
        },
    }));

    const confirm = () => {
        const quantity = parseInt(qty, 10);
        if (!part.trim() || !pkg.trim() || !Number.isFinite(quantity) || quantity < 0) return;
        onSave(machine, { partName: part, packageName: pkg.trim(), qty: quantity })
            .then(() => dialogRef.current?.close())
            .catch(() => {});
    };

    return (
        <dialog ref={dialogRef} id="deemo_add_lot_modal" className="modal">
            <div className="modal-box bg-base-300">
                <h3 className="font-bold text-lg mb-4">Add Lot{machine ? ` to ${machine}` : ""}</h3>
                <div className="flex flex-col gap-2">
                    <input className="input input-bordered w-full" placeholder="Part name" value={part} onChange={(e) => setPart(e.target.value)} />
                    <input className="input input-bordered w-full" placeholder="Package name" value={pkg} onChange={(e) => setPkg(e.target.value)} />
                    <input type="number" min="0" className="input input-bordered w-full" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
                </div>
                <div className="modal-action">
                    <form method="dialog"><button className="btn btn-ghost">Cancel</button></form>
                    <button className="btn btn-primary" disabled={disabled} onClick={confirm}>Add Lot</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
});

// ── Add group (bucket) ───────────────────────────────────────────────────
const BUCKET_PRESETS = ["Anticipate", "Upcoming"];

/** `onCreate({ label, machine })` -> Promise<boolean> (false = failed, keep open) */
export const AddBucketModal = forwardRef(function AddBucketModal({ disabled, onCreate }, ref) {
    const dialogRef = useRef(null);
    const [machine, setMachine] = useState(null);
    const [label, setLabel] = useState("");

    useImperativeHandle(ref, () => ({
        open(m) {
            setLabel("");
            setMachine(m);
            dialogRef.current?.showModal();
        },
    }));

    const confirm = async () => {
        const ok = await onCreate({ label: label.trim(), machine });
        if (ok !== false) dialogRef.current?.close();
    };

    return (
        <dialog ref={dialogRef} id="add_bucket_modal" className="modal">
            <div className="modal-box bg-base-300">
                <h3 className="font-bold text-lg mb-3">Add group{machine ? ` under ${machine}` : ""}</h3>
                <div className="flex gap-2 mb-3">
                    {BUCKET_PRESETS.map((p) => (
                        <button key={p} type="button" className="btn btn-sm" onClick={() => setLabel(p)}>{p}</button>
                    ))}
                </div>
                <input className="input input-bordered w-full" placeholder="Group name" value={label} onChange={(e) => setLabel(e.target.value)} />
                <div className="modal-action">
                    <form method="dialog"><button className="btn btn-ghost">Cancel</button></form>
                    <button className="btn btn-primary" disabled={!label.trim() || disabled} onClick={confirm}>Add</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
});