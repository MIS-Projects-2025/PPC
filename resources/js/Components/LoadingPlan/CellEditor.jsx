import { EDITABLE_COLUMNS } from "@/Lib/LoadingPlan/columnConfig";
import { coerceValue, getInputType } from "@/Lib/LoadingPlan/helpers";
import { useEffect, useRef, useState } from "react";

const INPUT_CLASS =
    "w-full h-full border border-info ring-2 ring-info/30 rounded px-2 text-sm outline-none bg-base-100 text-base-content";

/** commit/cancel run at most once (Enter followed by blur must not double-save). */
function useEditorLifecycle(onClose) {
    const done = useRef(false);

    const commitOnce = (fn) => {
        if (done.current) return;
        done.current = true;
        fn();
    };
    const cancel = () => {
        done.current = true;
        onClose(false);
    };
    const onKeyDown = (commit) => (e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") cancel();
    };

    return { commitOnce, onKeyDown };
}

/** Generic text/number editor, driven by EDITABLE_COLUMNS. */
export function CellEditor({ row, column, onRowChange, onClose }) {
    const field = column.key;
    const type = EDITABLE_COLUMNS[field];
    const initialValue = String(row[field] ?? "");

    const valueRef = useRef(initialValue);
    const inputRef = useRef(null);
    const { commitOnce, onKeyDown } = useEditorLifecycle(onClose);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const commit = () =>
        commitOnce(() => {
            if (valueRef.current === initialValue) return onClose(false);
            onRowChange({ ...row, [field]: coerceValue(valueRef.current, type) }, true);
        });

    return (
        <input
            ref={inputRef}
            type={getInputType(type)}
            defaultValue={initialValue}
            className={INPUT_CLASS}
            onChange={(e) => { valueRef.current = e.target.value; }}
            onBlur={commit}
            onKeyDown={onKeyDown(commit)}
        />
    );
}

/** Start time (HH:mm) + day offset (yesterday / today / tomorrow). */
export function TimeStartEditor({ row, onRowChange, onClose }) {
    const [time, setTime] = useState(row.time_start ?? "");
    const [day, setDay] = useState(row.time_start_day_offset ?? 0);
    const wrapRef = useRef(null);
    const timeRef = useRef(null);
    const { commitOnce, onKeyDown } = useEditorLifecycle(onClose);

    useEffect(() => { timeRef.current?.focus(); }, []);

    const commit = () =>
        commitOnce(() => {
            const unchanged = time === row.time_start && day === (row.time_start_day_offset ?? 0);
            if (!time || unchanged) return onClose(false);
            onRowChange({ ...row, time_start: time, time_start_day_offset: day }, true);
        });

    return (
        <div
            ref={wrapRef}
            className="flex w-full h-full gap-1 items-center"
            onBlur={(e) => { if (!wrapRef.current?.contains(e.relatedTarget)) commit(); }}
            onKeyDown={onKeyDown(commit)}
        >
            <input
                ref={timeRef}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-full flex-1 min-w-0 border border-info rounded px-1 text-sm bg-base-100"
            />
            <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="h-full border border-info rounded text-xs bg-base-100"
            >
                <option value={-1}>Yest</option>
                <option value={0}>Today</option>
                <option value={1}>Tmrw</option>
            </select>
        </div>
    );
}

/** Duration edited in hours, stored in minutes. */
export function AccuTimeEditor({ row, onRowChange, onClose }) {
    const [hours, setHours] = useState(row.accu_time == null ? "" : String(+(row.accu_time / 60).toFixed(4)));
    const inputRef = useRef(null);
    const { commitOnce, onKeyDown } = useEditorLifecycle(onClose);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const commit = () =>
        commitOnce(() => {
            const h = parseFloat(hours);
            if (!Number.isFinite(h) || h < 0) return onClose(false);
            const minutes = Math.round(h * 60);
            if (minutes === row.accu_time) return onClose(false);
            onRowChange({ ...row, accu_time: minutes }, true);
        });

    return (
        <input
            ref={inputRef}
            type="number"
            step="0.01"
            min="0"
            className={INPUT_CLASS}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown(commit)}
        />
    );
}