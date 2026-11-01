import { Suspense, lazy } from "react";

export const MISSING_PARTS_MODAL_ID = "missing_parts_modal";

// module level: creating this inside a component would remount the form on every render
const PartNameMultiInsertForm = lazy(() =>
    import("@/Pages/PartNameMultiUpsert").then((m) => ({ default: m.PartNameMultiInsertForm })),
);

export default function MissingPartsModal({ parts, onSaved }) {
    return (
        <dialog id={MISSING_PARTS_MODAL_ID} className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-6xl">
                {parts && (
                    <Suspense fallback={<span className="loading loading-spinner" />}>
                        <PartNameMultiInsertForm parts={parts} onSaved={onSaved} />
                    </Suspense>
                )}
                <div className="modal-action">
                    <form method="dialog"><button className="btn btn-ghost btn-sm">Close</button></form>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
}