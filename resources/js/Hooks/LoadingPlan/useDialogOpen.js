import { useEffect, useState } from "react";

/** True while the <dialog> is open. Lets a modal mount its (heavy) body only when needed. */
export function useDialogOpen(ref) {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const sync = () => setOpen(el.open);
        const mo = new MutationObserver(sync);
        mo.observe(el, { attributes: true, attributeFilter: ["open"] });
        sync();
        return () => mo.disconnect();
    }, [ref]);
    return open;
}