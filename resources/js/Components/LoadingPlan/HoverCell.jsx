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

export default function HoverCell({ trigger, children, placement = "right" }) {
    const [open, setOpen] = React.useState(false);
    const [isHovering, setIsHovering] = React.useState(false);
    const arrowRef = React.useRef(null);

    const floating = useFloating({
        open,
        onOpenChange: setOpen,
        placement,
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

    return (
        <>
            <span
                ref={floating.refs.setReference}
                {...getReferenceProps()}
                onMouseEnter={(e) => {
                    setIsHovering(true);
                    getReferenceProps().onMouseEnter?.(e);
                }}
                onMouseLeave={(e) => {
                    setIsHovering(false);
                    getReferenceProps().onMouseLeave?.(e);
                }}
                className={`flex items-center w-full h-full py-2 box-border transition-colors duration-100 ${
                    isHovering ? "bg-base-100" : "bg-transparent"
                }`}
            >
                {trigger}
            </span>
            {open && (
                <FloatingPortal>
                    <div
                        ref={floating.refs.setFloating}
                        style={floating.floatingStyles} // position/maxHeight only — no colors here
                        className="z-50 bg-opposite-100 border border-opposite-300 rounded-lg shadow-lg min-w-[180px] flex flex-col overflow-visible text-base-content"
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
