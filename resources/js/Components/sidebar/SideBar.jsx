import Navigation from "@/Components/sidebar/Navigation";
import ThemeToggler from "@/Components/sidebar/ThemeToggler";
import { useThemeStore } from "@/Store/themeStore";
import { Link, usePage } from "@inertiajs/react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { GoSidebarCollapse, GoSidebarExpand } from "react-icons/go";

export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth < breakpoint;
    });

    useEffect(() => {
        const onResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [breakpoint]);

    return isMobile;
}

export default function Sidebar() {
    const { display_name } = usePage().props;
    const { theme, toggleTheme } = useThemeStore();
    const isMobile = useIsMobile();

    // Single source of truth for collapsed state
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        if (typeof window === "undefined") return false;
        try {
            const saved = localStorage.getItem("sidebar_collapsed");
            return saved !== null ? JSON.parse(saved) : false;
        } catch {
            return false;
        }
    });

    // Save state on toggle (desktop only)
    useEffect(() => {
        if (!isMobile) {
            localStorage.setItem("sidebar_collapsed", JSON.stringify(isSidebarCollapsed));
        }
    }, [isSidebarCollapsed, isMobile]);

    return (
        <aside
            className={clsx(
                "flex z-10 shadow-lg transition-all duration-200",
                isSidebarCollapsed ? "w-16" : "w-64"
            )}
        >
            <div
                className="flex flex-col min-h-screen w-full space-y-6 px-4 pb-6 pt-4"
                style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                }}
            >
                <div className="flex items-center">
                    <Link
                        className={clsx(
                            "flex-1 flex items-center pl-2.5 text-lg font-bold",
                            isSidebarCollapsed && "hidden"
                        )}
                    >
                        <p className="pt-0.5 pl-1">PPC Portal</p>
                    </Link>
                    <button
                        type="button"
                        className="btn-square btn"
                        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                    >
                        {isSidebarCollapsed ? (
                            <GoSidebarCollapse className="w-6 h-6" />
                        ) : (
                            <GoSidebarExpand className="w-6 h-6" />
                        )}
                    </button>
                </div>

                <Navigation isCollapse={isSidebarCollapsed} />

                <ThemeToggler toggleTheme={toggleTheme} theme={theme} />
            </div>
        </aside>
    );
}