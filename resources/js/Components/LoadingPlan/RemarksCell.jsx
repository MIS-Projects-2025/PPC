import React from "react";
import HoverCell from "./HoverCell";

// ---------------------------------------------------------------------------
// RemarksCell
// Truncates long remarks with an ellipsis. Only enables the hover popover
// when the text is actually overflowing (scrollWidth > clientWidth) — a
// short remark that already fits gets no hover affordance at all.
// ---------------------------------------------------------------------------
export default function RemarksCell({ value }) {
    const textRef = React.useRef(null);
    const [isTruncated, setIsTruncated] = React.useState(false);

    React.useEffect(() => {
        const el = textRef.current;
        if (!el) return;

        const checkTruncation = () => {
            setIsTruncated(el.scrollWidth > el.clientWidth);
        };

        checkTruncation();

        // re-check if the column is resized or the container width changes
        const observer = new ResizeObserver(checkTruncation);
        observer.observe(el);
        return () => observer.disconnect();
    }, [value]);

    const text = value || "";

    if (!text) {
        return null;
    }

    const truncatedSpan = (
        <span
            ref={textRef}
            className="text-xs text-base-content/60 italic"
            style={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                cursor: isTruncated ? "help" : "default",
            }}
        >
            {text}
        </span>
    );

    // if (!isTruncated) {
    //     return truncatedSpan;
    // }

    return (
        <HoverCell trigger={truncatedSpan}>
            <div
                style={{
                    fontSize: 13,
                    color: "#666",
                    maxWidth: 260,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                }}
            >
                {text}
            </div>
        </HoverCell>
    );
}

// ---------------------------------------------------------------------------
// Column def usage:
//
//   import { RemarksCell } from "./RemarksCell";
//
//   columnHelper.accessor("Remarks", {
//     header: "Remarks",
//     size: 160,
//     cell: (info) => <RemarksCell value={info.getValue()} />,
//   }),
// ---------------------------------------------------------------------------
