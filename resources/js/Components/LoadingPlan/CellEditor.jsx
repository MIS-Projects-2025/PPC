import { useCallback, useEffect, useRef } from "react";

export function CellEditor({ editCell, onCommit, onCancel }) {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const commit = useCallback(() => {
        const next = inputRef.current?.value ?? "";
        if (next === editCell.value) {
            onCancel();
            return;
        }
        onCommit(next);
    }, [onCommit, onCancel, editCell.value]);

    const inputType = getInputType(editCell.type);

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={commit} />
            <input
                ref={inputRef}
                type={inputType}
                defaultValue={editCell.value}
                style={{
                    position: "fixed",
                    top: editCell.y,
                    left: editCell.x,
                    width: editCell.width,
                    height: editCell.height,
                    zIndex: 50,
                }}
                className="border border-info ring-2 ring-info/30 rounded px-2 text-sm outline-none bg-base-100 text-base-content"
                onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") onCancel();
                }}
            />
        </>
    );
}

const getInputType = (type) => {
    switch (type) {
        case "integer":
        case "decimal":
            return "number";
        case "time":
            return "time";
        case "date":
            return "date";
        default:
            return "text";
    }
};
