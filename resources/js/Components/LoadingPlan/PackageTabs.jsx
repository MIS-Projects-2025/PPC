import { useEffect, useRef, useState } from "react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";

export default function PackageTabs({ packages, active, onChange }) {
    const scrollRef = useRef(null);
    const tabRefs = useRef(new Map());
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

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
    }, [packages]);

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
                {packages.map((pkg) => (
                    <button
                        key={pkg}
                        type="button"
                        ref={(node) => {
                            if (node) tabRefs.current.set(pkg, node);
                            else tabRefs.current.delete(pkg);
                        }}
                        role="tab"
                        onClick={() => onChange(pkg)}
                        className={`tab flex-shrink-0 whitespace-nowrap ${
                            active === pkg
                                ? "tab-active text-primary font-bold"
                                : ""
                        }`}
                    >
                        {pkg}
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
