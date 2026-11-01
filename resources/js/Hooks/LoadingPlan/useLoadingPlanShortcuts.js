import { useEffect } from "react";

/** Ctrl+F search, Escape, Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z). */
export function useLoadingPlanShortcuts({
    readOnly,
    searchOpen,
    openSearch,
    closeSearch,
    clearSelection,
    beginWrite,
    onUndo,
    onRedo,
}) {
    useEffect(() => {
        const onKey = (e) => {
            const dialogOpen = () => !!document.querySelector("dialog[open]");

            if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "f") {
                if (dialogOpen()) return;
                e.preventDefault();
                openSearch();
                return;
            }

            if (e.key === "Escape") {
                if (searchOpen) {
                    closeSearch();
                    return;
                }
                clearSelection();
            }

            const tag = e.target?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            if (dialogOpen()) return;
            if (readOnly) return;
            if (!(e.ctrlKey || e.metaKey)) return;

            const k = e.key?.toLowerCase();
            if (!k) return;
            const isUndo = k === "z" && !e.shiftKey;
            const isRedo = k === "y" || (k === "z" && e.shiftKey);
            if (!isUndo && !isRedo) return;

            e.preventDefault();
            if (!beginWrite()) return;
            (isUndo ? onUndo : onRedo)();
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [readOnly, searchOpen, openSearch, closeSearch, clearSelection, beginWrite, onUndo, onRedo]);
}