import { useEffect, useState } from "react";

const TUBE_TRAY = ["TUBE", "TRAY", "WAFFLE_TRAY"];
const MODAL_ID = "doable_edit_modal";

export default function DoableEditModal({ row, sameCount, disabled, onSaveOverride, onSaveRecipe, onOpenPartRecord }) {
    const [recipe, setRecipe] = useState("");
    const [doable, setDoable] = useState("");

    useEffect(() => {
        setRecipe(row?.doable_recipe_source?.recipe ?? "");
        setDoable(row?.doable ?? "");
    }, [row?.id, row?.doable, row?.doable_recipe_source?.recipe]);

    const missing = !!row?.part_missing_from_list;
    const tubeTray = TUBE_TRAY.includes(String(row?.doable_recipe_source?.allocation ?? "").trim().toUpperCase());
    const close = () => document.getElementById(MODAL_ID)?.close();
    const run = async (fn) => { try { await fn(); close(); } catch { /* handlers already toast */ } };

    const recipeNum = Number(recipe);
    const doableNum = doable === "" ? null : Number(doable);

    return (
        <dialog id={MODAL_ID} className="modal">
            <div className="modal-box bg-base-300 max-w-md space-y-5">
                <h3 className="font-bold text-lg">Doable: {row?.part_name} <span className="opacity-50 font-mono text-sm">{row?.lot_id}</span></h3>

                <section className="space-y-2">
                    <div className="font-semibold text-sm">Recipe for {row?.part_name}</div>
                    {missing ? (
                        <div className="alert alert-warning alert-soft text-sm flex justify-between">
                            <span>This part isn't in the package list yet.</span>
                            <button className="btn btn-xs" onClick={() => { close(); onOpenPartRecord(); }}>Add it</button>
                        </div>
                    ) : tubeTray ? (
                        <p className="text-xs opacity-70">TUBE/TRAY parts use a fixed 95% rule, so recipe doesn't apply.</p>
                    ) : (
                        <>
                            <input type="number" min="1" className="input input-bordered w-full" value={recipe} onChange={(e) => setRecipe(e.target.value)} />
                            <p className="text-xs opacity-60">Saved to the package list. Affects {sameCount} lot{sameCount !== 1 ? "s" : ""} on this plan.</p>
                            <button className="btn btn-sm btn-primary" disabled={disabled || !(recipeNum >= 1)} onClick={() => run(() => onSaveRecipe(row.part_name, recipeNum))}>Save recipe</button>
                        </>
                    )}
                </section>

                <div className="divider my-0" />

                <section className="space-y-2">
                    <div className="font-semibold text-sm">Override doable (this lot only)</div>
                    {!row?.entry_id ? (
                        <p className="text-xs opacity-70">Place this lot on a machine first.</p>
                    ) : (
                        <>
                            <input type="number" min="0" max={row?.qty} className="input input-bordered w-full" value={doable} onChange={(e) => setDoable(e.target.value)} />
                            <p className="text-xs opacity-60">Not saved to the package list. Clears itself if this lot's quantity changes.</p>
                            <div className="flex gap-2">
                                <button className="btn btn-sm btn-primary" disabled={disabled || doableNum === null || !(doableNum >= 0)} onClick={() => run(() => onSaveOverride(doableNum))}>Save override</button>
                                {row?.doable_overridden && (
                                    <button className="btn btn-sm btn-ghost" disabled={disabled} onClick={() => run(() => onSaveOverride(null))}>Clear override</button>
                                )}
                            </div>
                        </>
                    )}
                </section>

                <div className="modal-action"><form method="dialog"><button className="btn btn-ghost btn-sm">Close</button></form></div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
}