import { Deferred } from "@inertiajs/react";
import { useState } from "react";

const TAB_INFO = {
    overview: {
        label: "Overview",
        description:
            "Combined summary of every data integrity issue across part mismatches, unknown packages, and recipe issues.",
    },
    mismatches: {
        label: "Part Mismatches",
        description:
            "Parts found in WIP whose Lead Count, Focus Group, Body Size, or Package Name disagree with the package master — or that have no matching entry there at all.",
    },
    unknownPackages: {
        label: "Unknown Packages",
        description:
            "Package names found in today's WIP data that don't exist in the production line reference table yet.",
    },
    recipeMismatches: {
        label: "Recipe Issues",
        description:
            "Parts with no matching package list entry, no recipe assigned, a committed quantity below the recipe minimum, or no commit recorded yet.",
    },
};

// Every distinct issue reason gets its own tone so nothing visually collides.
const REASON_INFO = {
    no_package_list_entry: { label: "no master record", tone: "error" },
    field_mismatch: { label: "field mismatch", tone: "warning" },
    unknown_package: { label: "missing", tone: "secondary" },
    no_recipe: { label: "no recipe", tone: "accent" },
    qty_below_recipe: { label: "qty below recipe", tone: "info" },
    no_commit: { label: "no commit", tone: "ghost" },
};

function getReasonInfo(reason) {
    return REASON_INFO[reason] ?? { label: reason, tone: "ghost" };
}

function countReasons(rows, getReason) {
    const counts = {};
    (rows ?? []).forEach((row) => {
        const reason = getReason(row);
        counts[reason] = (counts[reason] ?? 0) + 1;
    });
    return counts;
}

function mismatchReason(row) {
    return row.reason === "no_package_list_entry"
        ? "no_package_list_entry"
        : "field_mismatch";
}

export const DATA_INTEGRITY_MODAL_ID = `data_integrity_modal-${crypto.randomUUID()}`;

function DataIntegrityModal({
    partnameMismatches,
    unknownPackages,
    recipeMismatches,
}) {
    const [activeTab, setActiveTab] = useState("overview");

    const mismatchCount = partnameMismatches?.length;
    const unknownCount = unknownPackages?.length;
    const recipeCount = recipeMismatches?.length;

    const overallCount =
        mismatchCount !== undefined &&
        unknownCount !== undefined &&
        recipeCount !== undefined
            ? mismatchCount + unknownCount + recipeCount
            : undefined;

    return (
        <dialog id={DATA_INTEGRITY_MODAL_ID} className="modal">
            <div className="modal-box max-w-5xl w-11/12">
                <form method="dialog">
                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                        ✕
                    </button>
                </form>

                <h3 className="font-bold text-lg mb-4">Data Integrity</h3>

                <div role="tablist" className="tabs tabs-border">
                    <a
                        role="tab"
                        className={`tab gap-2 ${activeTab === "overview" ? "tab-active" : ""}`}
                        onClick={() => setActiveTab("overview")}
                    >
                        {TAB_INFO.overview.label}
                        <TabBadge count={overallCount} tone="warning" />
                    </a>
                    <a
                        role="tab"
                        className={`tab gap-2 ${activeTab === "mismatches" ? "tab-active" : ""}`}
                        onClick={() => setActiveTab("mismatches")}
                    >
                        {TAB_INFO.mismatches.label}
                        <TabBadge count={mismatchCount} tone="warning" />
                    </a>
                    <a
                        role="tab"
                        className={`tab gap-2 ${activeTab === "unknownPackages" ? "tab-active" : ""}`}
                        onClick={() => setActiveTab("unknownPackages")}
                    >
                        {TAB_INFO.unknownPackages.label}
                        <TabBadge count={unknownCount} tone="error" />
                    </a>
                    <a
                        role="tab"
                        className={`tab gap-2 ${activeTab === "recipeMismatches" ? "tab-active" : ""}`}
                        onClick={() => setActiveTab("recipeMismatches")}
                    >
                        {TAB_INFO.recipeMismatches.label}
                        <TabBadge count={recipeCount} tone="warning" />
                    </a>
                </div>

                <div className="border-base-300 bg-base-100 pt-4 h-[28rem] flex flex-col">
                    {activeTab === "overview" && (
                        <>
                            <TabDescription
                                text={TAB_INFO.overview.description}
                            />
                            <div className="flex-1 overflow-y-auto">
                                <Deferred
                                    data={[
                                        "partnameMismatches",
                                        "unknownPackages",
                                        "recipeMismatches",
                                    ]}
                                    fallback={<TabLoading />}
                                >
                                    <OverviewSummary
                                        partnameMismatches={partnameMismatches}
                                        unknownPackages={unknownPackages}
                                        recipeMismatches={recipeMismatches}
                                    />
                                </Deferred>
                            </div>
                        </>
                    )}

                    {activeTab === "mismatches" && (
                        <>
                            <TabDescription
                                text={TAB_INFO.mismatches.description}
                            />
                            <div className="flex-1 overflow-y-auto">
                                <Deferred
                                    data="partnameMismatches"
                                    fallback={<TabLoading />}
                                >
                                    <MismatchesTable
                                        rows={partnameMismatches}
                                    />
                                </Deferred>
                            </div>
                        </>
                    )}

                    {activeTab === "unknownPackages" && (
                        <>
                            <TabDescription
                                text={TAB_INFO.unknownPackages.description}
                            />
                            <div className="flex-1 overflow-y-auto">
                                <Deferred
                                    data="unknownPackages"
                                    fallback={<TabLoading />}
                                >
                                    <UnknownPackagesList
                                        packages={unknownPackages}
                                    />
                                </Deferred>
                            </div>
                        </>
                    )}

                    {activeTab === "recipeMismatches" && (
                        <>
                            <TabDescription
                                text={TAB_INFO.recipeMismatches.description}
                            />
                            <div className="flex-1 overflow-y-auto">
                                <Deferred
                                    data="recipeMismatches"
                                    fallback={<TabLoading />}
                                >
                                    <RecipeIssuesTable
                                        rows={recipeMismatches}
                                    />
                                </Deferred>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn">Close</button>
                    </form>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    );
}

function TabDescription({ text }) {
    return (
        <div className="alert alert-info alert-soft text-xs py-2 mb-3 shrink-0">
            <span>{text}</span>
        </div>
    );
}

export function TabBadge({ count, tone }) {
    if (count === undefined)
        return <span className="loading loading-dots loading-xs" />;
    if (count === 0)
        return (
            <span className="badge badge-success badge-sm gap-1">✓ valid</span>
        );
    return <span className={`badge badge-${tone} badge-sm`}>{count}</span>;
}

function TabLoading() {
    return (
        <div className="flex items-center justify-center h-full">
            <span className="loading loading-spinner loading-md" />
        </div>
    );
}

function ValidState({ text }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
            <span className="badge badge-success gap-1">✓ valid</span>
            <p className="text-sm text-base-content/60">{text}</p>
        </div>
    );
}

function OverviewSummary({
    partnameMismatches,
    unknownPackages,
    recipeMismatches,
}) {
    const categories = [
        {
            key: "mismatches",
            label: TAB_INFO.mismatches.label,
            count: partnameMismatches?.length ?? 0,
            reasons: countReasons(partnameMismatches, mismatchReason),
        },
        {
            key: "unknownPackages",
            label: TAB_INFO.unknownPackages.label,
            count: unknownPackages?.length ?? 0,
            reasons: countReasons(unknownPackages, () => "unknown_package"),
        },
        {
            key: "recipeMismatches",
            label: TAB_INFO.recipeMismatches.label,
            count: recipeMismatches?.length ?? 0,
            reasons: countReasons(recipeMismatches, (row) => row.reason),
        },
    ];

    const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);

    if (totalCount === 0) {
        return <ValidState text="No data integrity issues found anywhere." />;
    }

    return (
        <div className="space-y-3">
            <div className="stat bg-base-200 rounded-box py-3 px-4">
                <div className="stat-title text-xs">Total Issues</div>
                <div className="stat-value text-2xl">{totalCount}</div>
            </div>

            {categories.map((cat) => (
                <div
                    key={cat.key}
                    className="border border-base-300 rounded-box p-3"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">
                            {cat.label}
                        </span>
                        {cat.count === 0 ? (
                            <span className="badge badge-success badge-sm">
                                valid
                            </span>
                        ) : (
                            <span className="badge badge-neutral badge-sm">
                                {cat.count}
                            </span>
                        )}
                    </div>

                    {cat.count === 0 ? (
                        <p className="text-xs text-base-content/60">
                            No issues found.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(cat.reasons).map(
                                ([reason, count]) => {
                                    const info = getReasonInfo(reason);
                                    return (
                                        <span
                                            key={reason}
                                            className={`badge badge-${info.tone} badge-sm gap-1`}
                                        >
                                            {info.label}: {count}
                                        </span>
                                    );
                                },
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function MismatchesTable({ rows }) {
    if (!rows?.length) {
        return <ValidState text="No mismatches found." />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="table table-sm table-pin-rows">
                <thead>
                    <tr>
                        <th>Lot Id</th>
                        <th>Part Name</th>
                        <th>Reason</th>
                        <th>Fields</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const info = getReasonInfo(mismatchReason(row));
                        return (
                            <tr key={row.customer_data_id ?? row.lot_id}>
                                <td className="font-mono text-xs">
                                    {row.lot_id}
                                </td>
                                <td>{row.part_name}</td>
                                <td
                                    className={`bg-${info.tone} text-center p-0`}
                                >
                                    <span>{info.label}</span>
                                </td>
                                <td>
                                    {Object.entries(row.fields ?? {}).map(
                                        ([field, values]) => (
                                            <div
                                                key={field}
                                                className="text-xs mb-1"
                                            >
                                                <span className="font-semibold">
                                                    {field}:
                                                </span>{" "}
                                                <span className="text-error">
                                                    {String(values.wip)}
                                                </span>
                                                {" → "}
                                                <span className="text-success">
                                                    {String(values.packageList)}
                                                </span>
                                            </div>
                                        ),
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function UnknownPackagesList({ packages }) {
    if (!packages?.length) {
        return <ValidState text="No unknown packages found." />;
    }

    const info = getReasonInfo("unknown_package");

    return (
        <ul className="list">
            {packages.map((pkg) => (
                <li key={pkg} className="list-row items-center">
                    <span className={`badge badge-${info.tone} badge-sm`}>
                        {info.label}
                    </span>
                    <span className="font-mono text-sm">{pkg}</span>
                </li>
            ))}
        </ul>
    );
}

function RecipeIssuesTable({ rows }) {
    if (!rows?.length) {
        return <ValidState text="No recipe issues found." />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="table table-sm table-pin-rows">
                <thead>
                    <tr>
                        <th>Lot Id</th>
                        <th>Part Name</th>
                        <th>Reason</th>
                        <th>Detail</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const info = getReasonInfo(row.reason);
                        return (
                            <tr key={row.customer_data_id ?? row.lot_id}>
                                <td className="font-mono text-xs">
                                    {row.lot_id}
                                </td>
                                <td>{row.part_name}</td>
                                <td
                                    className={`bg-${info.tone} text-center p-0`}
                                >
                                    <span>{info.label}</span>
                                </td>
                                <td className="text-xs">
                                    {row.reason === "qty_below_recipe" && (
                                        <div>
                                            <div>
                                                Committed qty:{" "}
                                                <span className="font-semibold">
                                                    {row.Qty}
                                                </span>
                                            </div>
                                            {row.recipeSource && (
                                                <div className="text-base-content/60">
                                                    Recipe:{" "}
                                                    {
                                                        row.recipeSource
                                                            .devicename
                                                    }{" "}
                                                    (
                                                    {
                                                        row.recipeSource
                                                            .packageType
                                                    }
                                                    ){" — recipe used: "}
                                                    {row.recipeSource.recipe}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default DataIntegrityModal;
