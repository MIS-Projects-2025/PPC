
import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react";
import clsx from "clsx";
import { createPortal } from "react-dom";
import { StatusBadge } from "./StatusBadge";

export const STATUS_GROUPS = [
    {
        statuses: [
            "NONE",
            "RUNNING",
            "DONE",
            "FINAL SHIP",
            "IQA",
            "OQA",
            "FVI",
            "VISUAL (FVI)",
            "BUY-OFF",
            "HOLD",
            "IQA HOLD",
            "TNR HOLD",
            "PACK LABEL HOLD",
            "FINAL QA HOLD",
            "REWORK",
        ],
    },
    {
        statuses: [
            "HANDLER",
            "FOR DO",
            "FOR PROCESS",
            "DETAPE",
            "DONE DETAPE",
            "BOXING",
            "FOR BAKE",
            "ON BAKE",
            "FOR SORT",
            "ON SORT",
            "FOR BRAND",
            "ON BRAND",
            "FOR LPI",
            "ON LPI",
            "FOR LLI",
            "ON LLI",
            "FOR LEADCON",
            "ON LEADCON",
        ],
    },
];

// Preserve the exported flat status list for other consumers.
export const STATUS_OPTIONS = STATUS_GROUPS.flatMap(
    ({ statuses }) => statuses
);

function StatusMenu({ anchor, current, disabled, onPick, onClose, zIndex = 40 }) {
    const { refs, floatingStyles } = useFloating({
        strategy: "fixed",
        placement: "bottom-start",
        elements: { reference: anchor },
        whileElementsMounted: autoUpdate,
        middleware: [
            offset(4),
            flip({ padding: 8, fallbackStrategy: "bestFit" }),
            shift({ padding: 8 }),
            size({
                padding: 8,
                apply({ availableHeight, availableWidth, elements }) {
                    elements.floating.style.maxHeight =
                        `${Math.max(160, availableHeight)}px`;

                    elements.floating.style.maxWidth =
                        `${availableWidth}px`;
                },
            }),
        ],
    });

    return createPortal(
        <>
            {/* Backdrop */}
            <div className="fixed inset-0" style={{ zIndex }} onClick={onClose} />

            {/* Status menu */}
            <div
                ref={refs.setFloating}
                style={{ ...floatingStyles, zIndex: zIndex + 1 }}
                className="
                    overflow-y-auto
                    w-[min(20rem,calc(100vw-1rem))]
                    p-3 rounded-lg
                    bg-base-100
                    border border-base-content/30
                    shadow-2xl
                "
            >
                <div className="
                    grid grid-cols-2
                    gap-3
                ">
                    {STATUS_GROUPS.map((group, index) => (
                        <section key={index} className="min-w-0">
                            <div className="flex flex-col gap-0.5">
                                {group.statuses.map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => onPick(status)}
                                        className={clsx(
                                            "btn btn-sm w-full justify-start",
                                            "min-h-6 h-auto px-2",
                                            "text-left whitespace-normal",
                                            "text-base-content",
                                            "border-base-content/15",
                                            "hover:bg-base-200 hover:border-primary",
                                            (current ?? "NONE") === status &&
                                                "ring-2 ring-primary",
                                        )}
                                    >
                                        <StatusBadge status={status} />
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </>,
        document.body,
    );
}

export default StatusMenu;
