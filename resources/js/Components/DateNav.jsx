import { useMemo } from "react";
import DatePicker from "react-datepicker";
import { MdCalendarMonth, MdChevronLeft, MdChevronRight } from "react-icons/md";

import "react-datepicker/dist/react-datepicker.css";

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function isSameDay(a, b) {
    return a.toDateString() === b.toDateString();
}

export default function DateNav({ selected, onChange, isNoFuture = false }) {
    const today = useMemo(() => new Date(), []);
    const yesterday = useMemo(() => addDays(today, -1), [today]);

    const label = isSameDay(selected, today)
        ? "Today"
        : isSameDay(selected, yesterday)
          ? "Yesterday"
          : selected.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
            });

    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                className="btn btn-sm btn-ghost btn-square"
                onClick={() => onChange(addDays(selected, -1))}
                aria-label="Previous day"
            >
                <MdChevronLeft size={18} />
            </button>

            <div className="z-100 relative">
                <DatePicker
                    selected={selected}
                    onChange={onChange}
                    dateFormat="MMM d, yyyy"
                    customInput={
                        <button
                            type="button"
                            className="btn btn-sm rounded-lg input flex items-center gap-2 min-w-[140px] justify-center"
                        >
                            <MdCalendarMonth size={14} />
                            {label}
                        </button>
                    }
                />
            </div>

            <button
                type="button"
                className="btn btn-sm btn-ghost btn-square"
                onClick={() => onChange(addDays(selected, 1))}
                disabled={isSameDay(selected, today) && isNoFuture}
                aria-label="Next day"
            >
                <MdChevronRight size={18} />
            </button>

            {!isSameDay(selected, today) && (
                <button
                    type="button"
                    className="btn btn-sm btn-outline ml-1"
                    onClick={() => onChange(today)}
                >
                    Get Today
                </button>
            )}
        </div>
    );
}
