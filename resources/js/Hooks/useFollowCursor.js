// hooks/useFollowCursor.js
import { useEffect, useRef } from "react";

export function useFollowCursor(active) {
    const posRef = useRef({ x: 0, y: 0 });
    const elRef = useRef(null);
    const rafRef = useRef(null);

    // always track position (cheap, no DOM writes) so the badge
    // doesn't flash at (0,0) the instant `active` flips true
    useEffect(() => {
        const handleMove = (e) => {
            posRef.current.x = e.clientX;
            posRef.current.y = e.clientY;
        };
        window.addEventListener("mousemove", handleMove, { passive: true });
        return () => window.removeEventListener("mousemove", handleMove);
    }, []);

    // only pay the rAF + DOM-write cost while actually saving
    useEffect(() => {
        if (!active) return;

        const tick = () => {
            if (elRef.current) {
                const { x, y } = posRef.current;
                elRef.current.style.transform = `translate3d(${x + 14}px, ${y + 14}px, 0)`;
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(rafRef.current);
    }, [active]);

    return elRef;
}