// components/SavingCursorBadge.jsx
import { useFollowCursor } from "@/Hooks/useFollowCursor";
import { createPortal } from "react-dom";

export function SavingCursorBadge({ active }) {
    const elRef = useFollowCursor(active);
    if (!active) return null;

    return createPortal(
        <span
            ref={elRef}
            className="pointer-events-none fixed left-0 top-0 z-[9999] flex items-center gap-1.5 rounded-md bg-opposite-100 px-2 py-1 text-xs text-info shadow"
            style={{ willChange: "transform" }}
        >
            <span className="loading loading-spinner loading-xs" />
            Saving…
        </span>,
        document.body
    );
}