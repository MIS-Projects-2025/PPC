import { useEffect, useRef, useState } from "react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";

// Normalize a tab item into a consistent shape. Accepts either a plain
// string (existing behavior) or an object like:
//   { value: "bake", label: "Bake", icon: <MdBakeryDining size={16} /> }
// `value` falls back to `label` if omitted, so { label: "Bake", icon }
// alone also works. `icon` may be a rendered element or a component
// reference (e.g. MdBakeryDining) — both are handled below.
function normalizeTab(item) {
    if (typeof item === "string") {
        return { value: item, label: item, icon: null };
    }
    const value = item.value ?? item.label;
    return { value, label: item.label ?? String(value), icon: item.icon ?? null };
}

function renderIcon(icon) {
    if (!icon) return null;
    // Support passing a component reference (e.g. `icon: MdBakeryDining`)
    // as well as an already-rendered element (e.g. `icon: <MdBakeryDining />`).
    if (typeof icon === "function") {
        const IconComp = icon;
        return <IconComp size={16} />;
    }
    return icon;
}

export default function ScrollableTabs({ items, active, onChange, storageKey }) {
    const scrollRef = useRef(null);
    const tabRefs = useRef(new Map());
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const didInit = useRef(false);

    const tabs = (items ?? []).map(normalizeTab);
    const values = tabs.map((t) => t.value);

    // On mount, restore the last active tab from localStorage (if a storageKey was given).
    // If nothing is stored, or the stored value isn't a current item,
    // fall back to the last item in the list.
    useEffect(() => {
        if (didInit.current) return;
        if (!tabs || tabs.length === 0) return;
        didInit.current = true;

        let stored = null;
        if (storageKey) {
            try {
                stored = localStorage.getItem(storageKey);
            } catch {
                // localStorage unavailable (e.g. private/incognito mode) - ignore
            }
        }

        const isValid = stored && values.includes(stored);
        const next = isValid ? stored : values[values.length - 1];

        if (next !== active) {
            onChange(next);
        }
    }, [items]);

    // Persist active tab whenever it changes.
    useEffect(() => {
        if (!active || !storageKey) return;
        try {
            localStorage.setItem(storageKey, active);
        } catch {
            // ignore write failures
        }
    }, [active, storageKey]);

    const updateScrollState = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 1);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", updateScrollState);
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => {
            el.removeEventListener("scroll", updateScrollState);
            ro.disconnect();
        };
    }, [items]);

    useEffect(() => {
        tabRefs.current
            .get(active)
            ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, [active]);

    const scrollByAmount = (dir) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: "smooth" });
    };

    return (
        <div className="relative flex items-center border-base-300">
            {canScrollLeft && (
                <div className="relative flex-shrink-0 z-10">
                    <button
                        type="button"
                        onClick={() => scrollByAmount(-1)}
                        aria-label="Scroll tabs left"
                        className="btn btn-ghost px-2 flex items-center justify-center text-base-content/50 hover:text-base-content/80 hover:bg-base-200"
                    >
                        <MdChevronLeft size={26} />
                    </button>
                    <div className="pointer-events-none absolute top-0 bottom-0 -right-20 w-20 bg-gradient-to-r from-base-200 to-transparent" />
                </div>
            )}

            <div
                ref={scrollRef}
                role="tablist"
                className="tabs tabs-lift flex-nowrap overflow-x-auto scrollbar-none scroll-smooth"
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.value}
                        type="button"
                        ref={(node) => {
                            if (node) tabRefs.current.set(tab.value, node);
                            else tabRefs.current.delete(tab.value);
                        }}
                        role="tab"
                        onClick={() => onChange(tab.value)}
                        className={`tab flex-shrink-0 whitespace-nowrap gap-1.5 ${
                            active === tab.value
                                ? "tab-active text-primary font-bold"
                                : ""
                        }`}
                    >
                        {renderIcon(tab.icon)}
                        {tab.label}
                    </button>
                ))}
            </div>

            {canScrollRight && (
                <div className="relative flex-shrink-0 z-10">
                    <div className="pointer-events-none absolute top-0 bottom-0 -left-20 w-20 bg-gradient-to-l from-base-200 to-transparent" />
                    <button
                        type="button"
                        onClick={() => scrollByAmount(1)}
                        aria-label="Scroll tabs right"
                        className="btn btn-ghost px-2 flex items-center justify-center text-base-content/50 hover:text-base-content/80 hover:bg-base-200"
                    >
                        <MdChevronRight size={26} />
                    </button>
                </div>
            )}
        </div>
    );
}