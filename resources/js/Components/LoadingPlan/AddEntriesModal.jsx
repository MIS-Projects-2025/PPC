import { forwardRef, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TableActionsContext } from "./RowContent";

const DEFAULT_BLOCK_PRESETS = {
    setup: { label: "Set-up", duration: 120 },
    conversion: { label: "Conversion", duration: 600 },
    pm: { label: "PM", duration: 120 },
    systemTime: { label: "System Time", duration: 600 },
    hardDown: { label: "Hard Down", duration: 600 },
    configuration: { label: "Configuration", duration: 600 },
};

const AddEntryModal = forwardRef(function AddEntryModal(
    {
        anchorRow,
        placement: initialPlacement = "below",
        onClose,
        machine: machineProp,
        date,
        packageGroups,
        activePackage,
        handleAddRow,
        saveBlock,
        blockPresets = DEFAULT_BLOCK_PRESETS,
    },
    ref,
) {
    const { isUpdating = null } = useContext(TableActionsContext);

    // "lot" | "block"
    const [entryType, setEntryType] = useState("lot");
    // "above" | "below" relative to anchorRow
    const [placement, setPlacement] = useState(initialPlacement);

    // ── lot fields ────────────────────────────────────────────────
    const groupPackages = useMemo(() => {
        if (!packageGroups || !activePackage) return [];
        return packageGroups[activePackage] ?? [];
    }, [packageGroups, activePackage]);

    const [partName, setPartName] = useState("");
    const [packageName, setPackageName] = useState("");
    const [qty, setQty] = useState("");

    // ── block fields ─────────────────────────────────────────────
    // blockPreset just tracks which radio is highlighted / where the
    // label+duration defaults came from. blockLabel/blockDuration are
    // the actual values submitted, and stay freely editable no matter
    // which preset was picked.
    const firstPresetKey = Object.keys(blockPresets)[0] ?? "custom";
    const [blockPreset, setBlockPreset] = useState(firstPresetKey);
    const [blockLabel, setBlockLabel] = useState(
        () => blockPresets[firstPresetKey]?.label ?? "",
    );
    const [blockDuration, setBlockDuration] = useState(
        () => String(blockPresets[firstPresetKey]?.duration ?? 60),
    );

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const machine = machineProp ?? anchorRow?.machine ?? null;

    const resetError = useCallback(() => {
        if (error) setError(null);
    }, [error]);

    // Selecting a preset fills the label/duration fields with its
    // defaults, but the user can still type over either afterward.
    const selectPreset = useCallback(
        (key) => {
            setBlockPreset(key);
            const preset = blockPresets[key];
            if (preset) {
                setBlockLabel(preset.label);
                setBlockDuration(String(preset.duration));
            }
            resetError();
        },
        [blockPresets, resetError],
    );

    const handleSubmit = useCallback(
        async (e) => {
            e?.preventDefault?.();
            if (submitting) return;

            if (!machine || !date) {
                setError("Missing machine or date context.");
                return;
            }

            const beforeEntryId = placement === "below" ? anchorRow?.entry_id ?? null : null;
            const afterEntryId  = placement === "above" ? anchorRow?.entry_id ?? null : null;

            setSubmitting(true);
            setError(null);

            try {
                if (entryType === "lot") {
                    const trimmedPart = partName.trim();
                    if (!trimmedPart) {
                        setError("Part name is required.");
                        setSubmitting(false);
                        return;
                    }

                    await handleAddRow(machine, {
                        partName: trimmedPart,
                        packageName,
                        qty: qty ? parseInt(qty, 10) : 0,
                        beforeEntryId,
                        afterEntryId,
                    });
                } else {
                    const label = blockLabel.trim();
                    const duration = parseInt(blockDuration, 10);
                    if (!label || !duration || duration <= 0) {
                        setError(
                            "Label and a valid duration are required.",
                        );
                        setSubmitting(false);
                        return;
                    }

                    await saveBlock(machine, label, duration, {
                        beforeEntryId,
                        afterEntryId,
                    });
                }

                onClose?.();
            } catch (err) {
                // handleAddRow/saveBlock already log + toast the failure;
                // just keep the modal open so the user can retry.
                setError("Couldn't create the new entry — please try again.");
            } finally {
                setSubmitting(false);
            }
        },
        [
            submitting,
            machine,
            date,
            placement,
            anchorRow,
            entryType,
            partName,
            packageName,
            qty,
            blockLabel,
            blockDuration,
            handleAddRow,
            saveBlock,
            onClose,
        ],
    );

    // Re-sync per-open state whenever we get a (new) anchor row, since
    // the <dialog> stays mounted between opens instead of remounting.
    useEffect(() => {
        if (!anchorRow) return;

        setPlacement(initialPlacement);
        setEntryType("lot");
        setError(null);

        setPartName("");
        setPackageName(anchorRow.package_name ?? groupPackages[0] ?? activePackage ?? "");
        setQty("");

        selectPreset(firstPresetKey);
        // selectPreset/firstPresetKey/groupPackages intentionally left out —
        // this effect should only re-run when the anchor row (or initial
        // placement) itself changes, not every time those derived values
        // are recomputed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorRow, initialPlacement]);

    const busy = submitting || Boolean(isUpdating);

    const anchorLabel = anchorRow
        ? `"${anchorRow.part_name ?? "—"}" (Lot ${anchorRow.lot_id ?? "—"})`
        : null;

    return (
        <dialog ref={ref} id="add_entry_modal" className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-2xl max-h-[80vh] flex flex-col">
                <h3 className="font-bold text-lg mb-1 flex flex-wrap items-center gap-2">
                    Add {entryType === "lot" ? "Lot" : "Block"}
                    {anchorRow && (
                        <span className="text-sm font-normal opacity-70">
                            {placement} {anchorLabel}
                        </span>
                    )}
                    {machine && (
                        <span className="badge badge-outline badge-sm font-normal">
                            {machine}
                        </span>
                    )}
                </h3>

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4 overflow-y-auto pr-1"
                >
                    {/* Entry type + placement toggles */}
                    <div className="flex flex-wrap gap-4">
                        <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4">
                            <legend className="fieldset-legend">
                                Entry type
                            </legend>
                            <div className="join">
                                <button
                                    type="button"
                                    className={`btn join-item btn-sm ${
                                        entryType === "lot"
                                            ? "btn-primary"
                                            : "btn-ghost"
                                    }`}
                                    onClick={() => {
                                        setEntryType("lot");
                                        resetError();
                                    }}
                                >
                                    Lot
                                </button>
                                <button
                                    type="button"
                                    className={`btn join-item btn-sm ${
                                        entryType === "block"
                                            ? "btn-primary"
                                            : "btn-ghost"
                                    }`}
                                    onClick={() => {
                                        setEntryType("block");
                                        resetError();
                                    }}
                                >
                                    Block
                                </button>
                            </div>
                        </fieldset>

                        <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4">
                            <legend className="fieldset-legend">
                                Placement
                            </legend>
                            <div className="join">
                                <button
                                    type="button"
                                    className={`btn join-item btn-sm ${
                                        placement === "above"
                                            ? "btn-primary"
                                            : "btn-ghost"
                                    }`}
                                    disabled={!anchorRow}
                                    onClick={() => setPlacement("above")}
                                >
                                    Above
                                </button>
                                <button
                                    type="button"
                                    className={`btn join-item btn-sm ${
                                        placement === "below"
                                            ? "btn-primary"
                                            : "btn-ghost"
                                    }`}
                                    disabled={!anchorRow}
                                    onClick={() => setPlacement("below")}
                                >
                                    Below
                                </button>
                            </div>
                            {!anchorRow && (
                                <p className="label text-xs opacity-70">
                                    No anchor row — will append to end.
                                </p>
                            )}
                        </fieldset>
                    </div>

                    {/* Lot fields */}
                    {entryType === "lot" && (
                        <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
                            <legend className="fieldset-legend">
                                Lot details
                            </legend>

                            <label className="label">Part name</label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="e.g. ABC1234"
                                value={partName}
                                onChange={(e) => {
                                    setPartName(e.target.value);
                                    resetError();
                                }}
                                autoFocus
                            />

                            <label className="label">Package</label>
                            {groupPackages.length > 0 ? (
                                <select
                                    className="select w-full"
                                    value={packageName}
                                    onChange={(e) =>
                                        setPackageName(e.target.value)
                                    }
                                >
                                    {groupPackages.map((pkg) => (
                                        <option key={pkg} value={pkg}>
                                            {pkg}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="Package name"
                                    value={packageName}
                                    onChange={(e) =>
                                        setPackageName(e.target.value)
                                    }
                                />
                            )}

                            <label className="label">Quantity</label>
                            <input
                                type="number"
                                min="0"
                                className="input w-full"
                                placeholder="0"
                                value={qty}
                                onChange={(e) => setQty(e.target.value)}
                            />
                        </fieldset>
                    )}

                    {/* Block fields */}
                    {entryType === "block" && (
                        <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
                            <legend className="fieldset-legend">
                                Block details
                            </legend>

                            <label className="label">Preset</label>
                            <div className="flex flex-col gap-2">
                                {Object.entries(blockPresets).map(
                                    ([key, preset]) => (
                                        <label
                                            key={key}
                                            className="label cursor-pointer justify-start gap-3"
                                        >
                                            <input
                                                type="radio"
                                                name="block-preset"
                                                className="radio radio-sm"
                                                checked={blockPreset === key}
                                                onChange={() => selectPreset(key)}
                                            />
                                            <span>
                                                {preset.label}
                                                {` (${preset.duration} min)`}
                                            </span>
                                        </label>
                                    ),
                                )}
                            </div>

                            {/* Always editable, regardless of which preset
                                is selected — the preset just seeds these. */}
                            <label className="label">Label</label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="Time block"
                                value={blockLabel}
                                onChange={(e) => {
                                    setBlockLabel(e.target.value);
                                    resetError();
                                }}
                            />

                            <label className="label">Duration (minutes)</label>
                            <input
                                type="number"
                                min="1"
                                className="input w-full"
                                value={blockDuration}
                                onChange={(e) => {
                                    setBlockDuration(e.target.value);
                                    resetError();
                                }}
                            />
                        </fieldset>
                    )}

                    {error && (
                        <div className="alert alert-error alert-sm text-sm py-2">
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="modal-action mt-2">
                        <button
                            type="button"
                            className="btn"
                            onClick={onClose}
                            disabled={busy}
                        >
                            Close
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={busy}
                        >
                            {submitting && (
                                <span className="loading loading-spinner loading-xs" />
                            )}
                            Add {entryType === "lot" ? "Lot" : "Block"}
                        </button>
                    </div>
                </form>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
});

export default AddEntryModal;