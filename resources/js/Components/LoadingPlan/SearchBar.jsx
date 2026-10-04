export function SearchBar({
    query,
    onQueryChange,
    matchCount,
    matchIndex,
    onNext,
    onPrev,
    onClose,
    inputRef,
    elsewhere = [],
    onGoElsewhere,
}) {
    return (
        <div className="absolute top-2 right-2 z-40 flex items-center gap-1 bg-base-100 border border-base-300 shadow-lg rounded-box px-2 py-1">
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        if (matchCount === 0 && elsewhere[0]) onGoElsewhere?.(elsewhere[0].tab);
                        else if (e.shiftKey) onPrev();
                        else onNext();
                    }
                    if (e.key === "Escape") {
                        e.stopPropagation();
                        onClose();
                    }
                }}
                placeholder="Find in table…"
                className="input input-xs input-bordered w-48"
            />
            <span className="text-[11px] text-base-content/60 whitespace-nowrap px-1 tabular-nums">
                {matchCount > 0 ? `${matchIndex + 1}/${matchCount}` : query ? "0/0" : ""}
            </span>
            {matchCount === 0 &&
                query &&
                elsewhere.map((e) => (
                    <button
                        key={e.tab}
                        className="btn btn-ghost btn-xs whitespace-nowrap"
                        onClick={() => onGoElsewhere?.(e.tab)}
                    >
                        {e.count} in {e.label} →
                    </button>
                ))}
            <button className="btn btn-ghost btn-xs" onClick={onPrev} disabled={matchCount === 0} aria-label="Find previous">
                ↑
            </button>
            <button className="btn btn-ghost btn-xs" onClick={onNext} disabled={matchCount === 0} aria-label="Find next">
                ↓
            </button>
            <button className="btn btn-ghost btn-xs" onClick={onClose} aria-label="Close search">
                ✕
            </button>
        </div>
    );
}