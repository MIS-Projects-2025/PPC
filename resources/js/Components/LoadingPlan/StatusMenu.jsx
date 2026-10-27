import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react";
import clsx from "clsx";
import { createPortal } from "react-dom";
import { StatusBadge } from "./StatusBadge";

export const STATUS_OPTIONS = [
    "DONE", "RUNNING", "HOLD", "FOR PROCESS", "FVI", "BOXING", "NONE", "OQA", "BUY-OFF",
    "ON BAKE", "FOR BAKE", "ON SORT", "FOR SORT", "FOR BRAND", "ON BRAND",
    "FOR LPI", "ON LPI", "FOR LLI", "ON LLI", "FOR LEADCON", "ON LEADCON",
];

function StatusMenu({ anchor, current, disabled, onPick, onClose }) {
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
                apply({ availableHeight, elements }) {
                    elements.floating.style.maxHeight = `${Math.max(160, availableHeight)}px`;
                },
            }),
        ],
    });

    return createPortal(
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                className="z-50 overflow-y-auto grid grid-cols-2 gap-1 min-w-72 p-1.5 rounded-lg
                           bg-opposite-200 border border-base-content/30 shadow-2xl"
            >
                {STATUS_OPTIONS.map((s) => (
                    <button
                        key={s}
                        disabled={disabled}
                        onClick={() => onPick(s)}
                        className={clsx(
                            "btn btn-sm justify-start px-2 text-base-content bg-base-100 border-base-content/15",
                            "hover:bg-base-200 hover:border-primary",
                            (current ?? "NONE") === s && "ring-2 ring-primary",
                        )}
                    >
                        <StatusBadge status={s} />
                    </button>
                ))}
            </div>
        </>,
        document.body,
    );
}

export default StatusMenu;