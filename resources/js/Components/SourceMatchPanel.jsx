import { toQty } from "@/Hooks/useLotActions";
import { useLotStore } from "@/Store/useLotStore";
import clsx from "clsx";
import { useState } from "react";

// Shown on the rows below or compared live against the form, so not repeated as a server warning.
const SHOWN_ELSEWHERE = new Set([
    "partname_mismatch",
    "qty_mismatch",
    "unknown_box_details",
    "no_box_details",
    "no_box_count",
    "count_conflict",
    "count_mismatch",
]);

const ISSUE_TEXT = {
    unknown_box_details: "unknown box name",
    no_box_details: "no box name",
    no_box_count: "no box count",
    count_conflict: "rows disagree, highest used",
    count_mismatch: "count differs from list, list used",
};

// "[15, 15, 18]" -> ["15","15","18"]; a plain name returns null.
const listEntries = (text) => {
    const t = String(text ?? "").trim();
    if (!t.startsWith("[")) return null;
    return t.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
};

// A list sets its own count (one entry = one box). A plain name uses the count field.
const boxCountOf = (form) => {
    const entries = listEntries(form.name);
    return entries ? entries.length : Number(form.count);
};

const boxSummary = (set) => {
    const parts = (set.items ?? []).map(
        (i) => `${i.name ?? i.label ?? "?"}${i.boxes > 1 ? ` ×${i.boxes}` : ""}`,
    );
    const names = parts.length ? parts.join(" + ") : (set.box_details ?? "no box name");
    return `${names} · ${set.no_of_box ?? "?"} ${set.no_of_box === 1 ? "box" : "boxes"}`;
};

const same = (a, b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/**
 * Read-only view of what the source tables say about the scanned lot, plus the group plan.
 * The only action is "Correct": an audited override of the box name/count (the source is never written).
 */
export default function SourceMatchPanel({ dimensions = [], lotActions }) {
    const match = useLotStore((s) => s.match);
    const pending = useLotStore((s) => s.pendingLotToBeAdded);
    const recommendation = useLotStore((s) => s.recommendation);

    const [editKey, setEditKey] = useState(null);
    const [form, setForm] = useState({ name: "", count: "" });
    const [saving, setSaving] = useState(false);

    if (match.status === "idle") return null;

    if (match.status === "loading") {
        return <div className="py-2 text-[11px] opacity-60">Checking source…</div>;
    }

    const data = match.data;
    const serverWarnings = (match.warnings ?? []).filter((w) => !SHOWN_ELSEWHERE.has(w.code));

    if (!data || data.status !== "found") {
        return (
            <div className="py-2 text-[11px] text-warning">
                {serverWarnings[0]?.message ?? "Source unavailable. Lot is stocked with unknown box info."}
            </div>
        );
    }

    const lotId = pending?.lot_id?.trim() ?? "";
    const primary = data.primary;

    // Scan vs source, compared live so typing part name / qty never triggers a new request.
    const localWarnings = [];
    if (pending?.partname && primary.partname && !same(pending.partname, primary.partname)) {
        localWarnings.push(`Part name differs: form ${pending.partname}, source ${primary.partname}.`);
    }
    const formQty = toQty(pending?.qty);
    if (formQty !== null && primary.qty !== null && formQty !== primary.qty) {
        localWarnings.push(`Quantity differs: form ${formQty}, source ${primary.qty}.`);
    }

    const startEdit = (set) => {
        setEditKey(set.key);
        setForm({ name: set.box_details ?? "", count: set.no_of_box ?? "" });
    };

    const save = async (set) => {
        setSaving(true);
        const ok = await lotActions.correctBoxInfo({
            lot_id: lotId,
            set_key: set.key,
            box_details: form.name.trim(),
            no_of_box: boxCountOf(form),
        });
        setSaving(false);
        if (ok) setEditKey(null);
    };

    return (
        <div className="py-2">
            <label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1">
                Source match
            </label>

            <div className="text-[11px] opacity-70 mb-1">
                {primary.source} · {data.group_id ? `group ${data.group_id}` : "no group"}
                {primary.partname && <> · {primary.partname}</>}
                {primary.qty !== null && <> · qty {primary.qty.toLocaleString()}</>}
            </div>

            {[...localWarnings, ...serverWarnings.map((w) => w.message)].map((m) => (
                <div key={m} className="text-[11px] text-warning">{m}</div>
            ))}

            {recommendation.joins && (
                <div className="text-[11px] text-info my-1">
                    These boxes are already in the rack. The lot goes to the same slots.
                </div>
            )}

            <div className="flex flex-col gap-1 mt-1">
                {data.sets.map((set) => {
                    const isMine = set.key === data.lot_set_key;
                    const editing = editKey === set.key;

                    return (
                        <div
                            key={set.key || "none"}
                            className={clsx(
                                "rounded border p-1.5 text-[11px]",
                                isMine ? "border-primary/60 bg-base-100" : "border-base-300",
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="font-bold">
                                    {boxSummary(set)}
                                    {set.overridden && <span className="badge badge-info badge-xs ml-1">corrected</span>}
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-xs"
                                    onClick={() => (editing ? setEditKey(null) : startEdit(set))}
                                >
                                    {editing ? "Cancel" : "Correct"}
                                </button>
                            </div>

                            <div className="opacity-70 break-words">
                                {set.lots.map((l, i) => (
                                    <span key={l}>
                                        {i > 0 && ", "}
                                        {same(l, lotId) ? <b>{l}</b> : l}
                                    </span>
                                ))}
                            </div>

                            {set.issues.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                    {set.issues.map((i) => (
                                        <span key={i} className="badge badge-warning badge-xs">{ISSUE_TEXT[i] ?? i}</span>
                                    ))}
                                </div>
                            )}

                            {editing && (
                                <div className="flex gap-1 mt-1">
                                    <input
                                        data-no-scanner
                                        type="text"
                                        list="box-size-options"
                                        placeholder="15 or [15, 15, 18]"
                                        className="input input-xs flex-1"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <datalist id="box-size-options">
                                        {dimensions.map((d) => (
                                            <option key={d.id} value={d.name}>{d.label}</option>
                                        ))}
                                    </datalist>
                                    <input
                                        data-no-scanner
                                        type="text"
                                        inputMode="numeric"
                                        className="input input-xs w-14"
                                        disabled={!!listEntries(form.name)}
                                        value={listEntries(form.name) ? listEntries(form.name).length : form.count}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, count: e.target.value.replace(/\D/g, "").slice(0, 3) }))
                                        }
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-xs"
                                        disabled={saving || !form.name.trim() || !(boxCountOf(form) > 0)}
                                        onClick={() => save(set)}
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {recommendation.plan?.length > 0 && (
                <div className="mt-1 text-[11px]">
                    <span className="opacity-60">Group plan: </span>
                    {recommendation.plan.map((p) => (
                        <div key={p.box_details}>
                            {p.box_details} ×{p.boxes} →{" "}
                            {p.slots.length
                                ? p.slots.map((s) => (p.slots.length > 1 ? `${s.label} (${s.boxes})` : s.label)).join(", ")
                                : "no fit"}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
