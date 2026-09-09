import React from "react";

import {
    arrow,
    autoUpdate,
    flip,
    FloatingArrow,
    FloatingPortal,
    offset,
    shift,
    size,
    useDismiss,
    useFloating,
    useHover,
    useInteractions,
    useRole,
} from "@floating-ui/react";

const ARROW_SIZE = 8;

// Returns a stable, dedicated portal target inside `dialogEl` for floating
// content to render into. Deliberately NOT the <dialog> itself — most modal
// styling (e.g. daisyUI's `display: grid; place-items: center` on the
// <dialog>) uses the dialog's own child list to center its content, and
// inserting/removing a floating-ui wrapper directly under it on every
// open/close perturbs that layout, which is what causes the dialog to
// visibly shift. This node is declared `position: fixed` (and zero-sized)
// up front, before it ever has children, so it's excluded from the dialog's
// layout from the start and toggling its contents can never affect it.
function getDialogPortalRoot(dialogEl) {
    if (!dialogEl) return null;
    let root = dialogEl.querySelector(":scope > [data-hovercell-portal-root]");
    if (!root) {
        root = document.createElement("div");
        root.setAttribute("data-hovercell-portal-root", "");
        Object.assign(root.style, {
            position: "fixed",
            inset: "0",
            width: "0",
            height: "0",
            overflow: "visible",
            pointerEvents: "none",
        });
        dialogEl.appendChild(root);
    }
    return root;
}

export default function HoverCell({ trigger, children, placement = "right" }) {
    const [open, setOpen] = React.useState(false);
    const [isHovering, setIsHovering] = React.useState(false);
    const [portalRoot, setPortalRoot] = React.useState(null);
    const arrowRef = React.useRef(null);

    const floating = useFloating({
        open,
        onOpenChange: setOpen,
        placement,
        // 'fixed' (not the default 'absolute') so the tooltip is positioned
        // against the viewport rather than counted as part of any scrollable
        // ancestor's content — otherwise, when portaled inside a scrolling
        // modal, it inflates that container's scrollHeight and triggers a
        // scrollbar-driven reflow/flicker every time it opens.
        strategy: "fixed",
        middleware: [
            offset(ARROW_SIZE + 4),
            flip(),
            shift({ padding: 8 }),
            size({
                padding: 8,
                apply({ availableHeight, elements }) {
                    elements.floating.style.maxHeight = `${Math.max(
                        availableHeight,
                        100,
                    )}px`;
                },
            }),
            arrow({ element: arrowRef, padding: 8 }),
        ],
        whileElementsMounted: autoUpdate,
    });

    const hover = useHover(floating.context, {
        delay: { open: 100, close: 100 },
    });
    const dismiss = useDismiss(floating.context);
    const role = useRole(floating.context, { role: "tooltip" });

    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        dismiss,
        role,
    ]);

    // If the trigger lives inside a native <dialog> (e.g. a daisyUI modal),
    // an *open* dialog is promoted to the browser's top layer and renders
    // above everything else in the page — including a portal appended to
    // document.body, no matter how high its z-index is. So instead of always
    // portaling to <body>, we portal into the nearest ancestor <dialog> when
    // one exists, which keeps the tooltip inside that same top-layer context.
    // Falls back to the default (document.body) for triggers outside a dialog.
    const setReference = React.useCallback(
        (node) => {
            floating.refs.setReference(node);
            const dialogEl = node?.closest?.("dialog") ?? null;
            setPortalRoot(dialogEl ? getDialogPortalRoot(dialogEl) : null);
        },
        [floating.refs],
    );

    return (
        <>
            <span
                ref={setReference}
                {...getReferenceProps()}
                onMouseEnter={(e) => {
                    setIsHovering(true);
                    getReferenceProps().onMouseEnter?.(e);
                }}
                onMouseLeave={(e) => {
                    setIsHovering(false);
                    getReferenceProps().onMouseLeave?.(e);
                }}
                className={`flex items-center w-full h-full box-border transition-colors duration-100 ${
                    isHovering ? "bg-base-100" : "bg-transparent"
                }`}
            >
                {trigger}
            </span>
            {open && (
                // portalRoot is `null` when there's no ancestor <dialog> —
                // must coerce to `undefined` here, since floating-ui's
                // internal default-root fallback only triggers on
                // `undefined`, not on an explicitly-passed `null`.
                <FloatingPortal root={portalRoot ?? undefined}>
                    <div
                        ref={floating.refs.setFloating}
                        style={floating.floatingStyles} // position/maxHeight only — no colors here
                        className="z-[10000] pointer-events-auto bg-opposite-100 border border-opposite-300 rounded-lg shadow-lg min-w-[180px] flex flex-col overflow-visible text-base-content"
                        {...getFloatingProps()}
                    >
                        <FloatingArrow
                            ref={arrowRef}
                            context={floating.context}
                            width={ARROW_SIZE * 2}
                            height={ARROW_SIZE}
                            className="fill-opposite-300 [&>path:first-child]:stroke-opposite-300"
                        />

                        <div className="p-2.5 overflow-y-auto overflow-x-hidden rounded-lg min-h-0">
                            {children}
                        </div>
                    </div>
                </FloatingPortal>
            )}
        </>
    );
}