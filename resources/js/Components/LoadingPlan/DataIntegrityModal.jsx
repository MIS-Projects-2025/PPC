import { Deferred } from "@inertiajs/react";
import { useState } from "react";

const TAB_INFO = {
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
};

function DataIntegrityModal({ partnameMismatches, unknownPackages }) {
    const [activeTab, setActiveTab] = useState("mismatches");

    const mismatchCount = partnameMismatches?.length;
    const unknownCount = unknownPackages?.length;

    return (
        <dialog id="data_integrity_modal" className="modal">
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
                </div>

                <div className="border-base-300 bg-base-100 pt-4 h-[28rem] flex flex-col">
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
    if (count === 0) return null;
    return <span className={`badge badge-${tone} badge-sm`}>{count}</span>;
}

function TabLoading() {
    return (
        <div className="flex items-center justify-center h-full">
            <span className="loading loading-spinner loading-md" />
        </div>
    );
}

function MismatchesTable({ rows }) {
    if (!rows?.length) {
        return (
            <p className="text-sm text-base-content/60 py-6 text-center">
                No mismatches found.
            </p>
        );
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
                    {rows.map((row) => (
                        <tr key={row.customer_data_id ?? row.Lot_Id}>
                            <td className="font-mono text-xs">{row.Lot_Id}</td>
                            <td>{row.Part_Name}</td>
                            <td>
                                {row.reason === "no_package_list_entry" ? (
                                    <span className="badge badge-error badge-sm">
                                        no master record
                                    </span>
                                ) : (
                                    <span className="badge badge-warning badge-sm">
                                        field mismatch
                                    </span>
                                )}
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
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function UnknownPackagesList({ packages }) {
    if (!packages?.length) {
        return (
            <p className="text-sm text-base-content/60 py-6 text-center">
                No unknown packages found.
            </p>
        );
    }

    return (
        <ul className="list">
            {packages.map((pkg) => (
                <li key={pkg} className="list-row items-center">
                    <span className="badge badge-error badge-sm">missing</span>
                    <span className="font-mono text-sm">{pkg}</span>
                </li>
            ))}
        </ul>
    );
}

export default DataIntegrityModal;
