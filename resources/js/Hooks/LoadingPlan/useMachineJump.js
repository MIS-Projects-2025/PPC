import { ROW_HEIGHT } from "@/Constants/LoadingPlan/constants";
import { ALL_PACKAGES_TAB, FOR_BAKE_TAB, ORPHAN_TAB, UNASSIGNED_TAB } from "@/Constants/LoadingPlan/tabs";
import { useCallback, useEffect, useRef, useState } from "react";

const FLASH_MS = 2000; // keep in sync with the css animation
const TABS_WITHOUT_MACHINES = new Set([UNASSIGNED_TAB, ORPHAN_TAB, FOR_BAKE_TAB]);

const findMachineHeader = (rows, machine) =>
    rows.findIndex((r) => r.__type === "header" && r.__headerKind !== "bucket" && r.machine === machine);

/**
 * "Jump to machine": make sure the machine's header is in the grid (switch tab / expand /
 * show idle machines if needed), scroll to it, and flash it.
 * `jumpedMachine` is the key to put `machine-jump-flash` on (see rowClass in Deemo).
 */
export function useMachineJump({
    displayRows,
    gridRef,
    activeTab,
    isTabSwitching,
    goToTab,
    setCollapsedMachines,
    showAllMachines,
    setShowAllMachines,
    toast,
}) {
    const [pending, setPending] = useState(null); // { machine } - new object per jump so re-jumping re-runs the effect
    const [jumpedMachine, setJumpedMachine] = useState(null);
    const timerRef = useRef(0);
    const frameRef = useRef(0);

    useEffect(
        () => () => {
            clearTimeout(timerRef.current);
            cancelAnimationFrame(frameRef.current);
        },
        [],
    );

    const flash = useCallback((machine) => {
        clearTimeout(timerRef.current);
        cancelAnimationFrame(frameRef.current);
        setJumpedMachine(null); // drop the class first so the animation restarts on a repeat jump
        frameRef.current = requestAnimationFrame(() => {
            setJumpedMachine(machine);
            timerRef.current = setTimeout(() => setJumpedMachine(null), FLASH_MS + 150);
        });
    }, []);

    const latest = useRef({ activeTab, displayRows });
    latest.current = { activeTab, displayRows };

    const jumpToMachine = useCallback(
        (machine) => {
            const { activeTab, displayRows } = latest.current;

            const needsAllTab =
                activeTab !== ALL_PACKAGES_TAB &&
                (TABS_WITHOUT_MACHINES.has(activeTab) || findMachineHeader(displayRows, machine) === -1);
            if (needsAllTab) goToTab(ALL_PACKAGES_TAB);

            setCollapsedMachines((prev) => {
                if (!prev.has(machine)) return prev;
                const next = new Set(prev);
                next.delete(machine);
                return next;
            });

            setPending({ machine });
        },
        [goToTab, setCollapsedMachines],
    );

    // Runs after every display-rows rebuild until the header exists.
    useEffect(() => {
        if (!pending || isTabSwitching) return; // wait for the deferred tab to settle

        const idx = findMachineHeader(displayRows, pending.machine);

        if (idx === -1) {
            if (!showAllMachines) {
                setShowAllMachines(true); // machine has no rows in this view: reveal idle machines, then retry
                return;
            }
            setPending(null);
            toast?.info?.("That machine isn't visible in this view.");
            return;
        }

        const el = gridRef.current?.element;
        setPending(null);
        if (!el) return;

        // One row above the target: the sticky-header overlay covers the first visible slot,
        // so scrolling the header exactly to the top would hide it under the previous group's overlay.
        el.scrollTop = Math.max(0, idx - 1) * ROW_HEIGHT;
        flash(pending.machine);
    }, [pending, displayRows, isTabSwitching, showAllMachines, setShowAllMachines, gridRef, flash, toast]);

    return { jumpToMachine, jumpedMachine };
}