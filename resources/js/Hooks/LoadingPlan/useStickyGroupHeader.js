// useStickyGroupHeader.js (renamed from useStickyMachineHeader)
import { ROW_HEIGHT } from "@/Constants/LoadingPlan/constants";
import { useEffect, useMemo, useState } from "react";

export function useStickyGroupHeader(displayRows, gridRef) {
    const [stickyGroup, setStickyGroup] = useState(null);

    const groupHeaderOffsets = useMemo(() => {
        return displayRows.reduce((acc, row, index) => {
            if (row.__type === "header") {
                acc.push({ ...row, rowIndex: index });
            }
            return acc;
        }, []);
    }, [displayRows]);

    useEffect(() => {
        const el = gridRef.current?.element;
        if (!el || groupHeaderOffsets.length === 0) return;

        const handleScroll = () => {
            const rowAtTop = el.scrollTop / ROW_HEIGHT;
            let current = groupHeaderOffsets[0];
            for (const group of groupHeaderOffsets) {
                if (group.rowIndex <= rowAtTop) {
                    current = group;
                } else {
                    break;
                }
            }
            setStickyGroup(current);
        };

        handleScroll();
        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, [groupHeaderOffsets, gridRef]);

    return stickyGroup;
}