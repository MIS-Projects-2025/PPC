import BulkErrors from "@/Components/BulkErrors";
import ChangeReviewModal from "@/Components/ChangeReviewModal";
import DeleteModal from "@/Components/DeleteModal";
import MaxItemDropdown from "@/Components/MaxItemDropdown";
import Pagination from "@/Components/Pagination";
import SearchInput from "@/Components/SearchInput";
import Tabs from "@/Components/Tabs";
import DropdownCell from "@/Components/tanStackTable/DropdownCell";
import ReadOnlyColumns from "@/Components/tanStackTable/ReadOnlyColumn";
import TanstackTable from "@/Components/tanStackTable/TanstackTable";
import { useEditableTable } from "@/Hooks/useEditableTable";
import { useMutation } from "@/Hooks/useMutation";
import { router, usePage } from "@inertiajs/react";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaPlus } from "react-icons/fa6";
import { MdOutlineDelete } from "react-icons/md";

const ppcPages = {
    "PL Reference": route("pl-ref.master.index"),
    "PL Rules": route("pl-ref.rules.index"),
};

const PL_OPTIONS = ["PL1", "PL6", null];
const BOOL_OPTIONS = ["true", "false"];

function PpcPackageMasterPage() {
    const [selectedPage, setSelectedPage] = useState("PL Reference");

    const handleSelectPage = (name) => {
        setSelectedPage(name);
        router.visit(ppcPages[name]);
    };

    const {
        packages: serverPackages,
        search: serverSearch,
        perPage: serverPerPage,
        totalEntries,
    } = usePage().props;

    const start = serverPackages.from;
    const end = serverPackages.to;
    const filteredTotal = serverPackages.total;
    const overallTotal = totalEntries ?? filteredTotal;

    const [searchInput, setSearchInput] = useState(serverSearch || "");
    const [maxItem, setMaxItem] = useState(serverPerPage || 25);
    const [currentPage, setCurrentPage] = useState(
        serverPackages.current_page || 1,
    );

    const saveChangeIDModal = "ppc_master_save_modal";
    const deleteModalRef = useRef(null);

    const {
        mutate: mutatePackage,
        isLoading: isMutateLoading,
        errorMessage: mutateErrorMessage,
        errorData: mutateErrorData,
    } = useMutation();

    const {
        mutate: deletePackage,
        isLoading: isDeleteLoading,
        errorMessage: deleteErrorMessage,
        cancel: deleteCancel,
    } = useMutation();

    useEffect(() => {
        if (!mutateErrorMessage) return;
        toast.error(mutateErrorMessage);
    }, [mutateErrorMessage, mutateErrorData]);

    const isTelfordColumn = React.useMemo(
        () => ({
            accessorKey: "is_telford",
            header: "Telford",
            size: 100,
            cell: React.memo(({ getValue, row, column, table }) => (
                <DropdownCell
                    value={Number(getValue()) ? "true" : "false"}
                    rowIndex={row.index}
                    columnId={column.id}
                    statusOptions={BOOL_OPTIONS}
                    onChange={(rowIndex, columnId, value) => {
                        value = value === "true" ? 1 : 0;
                        table.options.meta.updateData(
                            rowIndex,
                            columnId,
                            value,
                        );
                    }}
                />
            )),
        }),
        [],
    );

    const defaultPlColumn = React.useMemo(
        () => ({
            accessorKey: "default_pl",
            header: "Default PL",
            size: 120,
            cell: React.memo(({ getValue, row, column, table }) => (
                <DropdownCell
                    value={getValue()}
                    rowIndex={row.index}
                    columnId={column.id}
                    statusOptions={PL_OPTIONS}
                    onChange={(rowIndex, columnId, value) =>
                        table.options.meta.updateData(rowIndex, columnId, value)
                    }
                />
            )),
        }),
        [],
    );

    const isActiveColumn = React.useMemo(
        () => ({
            accessorKey: "is_active",
            header: "Active",
            size: 100,
            cell: React.memo(({ getValue, row, column, table }) => (
                <DropdownCell
                    value={Number(getValue()) ? "true" : "false"}
                    rowIndex={row.index}
                    columnId={column.id}
                    statusOptions={BOOL_OPTIONS}
                    onChange={(rowIndex, columnId, value) => {
                        value = value === "true" ? 1 : 0;
                        table.options.meta.updateData(
                            rowIndex,
                            columnId,
                            value,
                        );
                    }}
                />
            )),
        }),
        [],
    );

    const columns = React.useMemo(
        () => [
            ReadOnlyColumns({
                accessorKey: "id",
                header: "ID",
                options: { size: 60, enableHiding: false },
            }),
            {
                accessorKey: "package",
                header: "Package",
                size: 160,
                enableHiding: false,
                type: "string",
            },
            isTelfordColumn,
            defaultPlColumn,
            isActiveColumn,
            ReadOnlyColumns({
                accessorKey: "updated_at",
                header: "Updated At",
                options: { size: 200 },
            }),
        ],
        [],
    );

    const {
        table,
        data,
        setData,
        setEditedRows,
        editedRows,
        handleResetChanges,
        handleAddNewRow,
        getChanges,
        changes,
    } = useEditableTable(serverPackages.data || [], columns, {
        createEmptyRow: () => ({
            package: "",
            is_telford: 1,
            default_pl: null,
            is_active: 1,
        }),
        isMultipleSelection: true,
    });

    console.log("🚀 ~ PpcPackageMasterPage ~ editedRows:", editedRows);

    const refresh = () => {
        router.reload({
            data: { search: searchInput, perPage: maxItem, page: currentPage },
            preserveState: true,
            preserveScroll: true,
        });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            router.reload({
                data: { search: searchInput, perPage: maxItem, page: 1 },
                preserveState: true,
                preserveScroll: true,
            });
            setCurrentPage(1);
        }, 700);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const goToPage = (page) => {
        router.reload({
            data: { search: searchInput, perPage: maxItem, page },
            preserveState: true,
            preserveScroll: true,
        });
        setCurrentPage(page);
    };

    const changeMaxItemPerPage = (max) => {
        router.reload({
            data: { search: searchInput, perPage: max, page: 1 },
            preserveState: true,
            preserveScroll: true,
        });
        setMaxItem(max);
    };

    const handleSaveClick = () => {
        const computedChanges = getChanges();
        if (computedChanges.length === 0) {
            alert("No changes to save.");
            return;
        }
        document.getElementById(saveChangeIDModal).showModal();
    };

    const handleDelete = async () => {
        try {
            await deletePackage(route("api.pl-ref.master.massDelete"), {
                body: { ids: Object.keys(table.getState().rowSelection) },
                method: "DELETE",
            });
            refresh();
            deleteModalRef.current.close();
            toast.success("Packages deleted successfully!");
        } catch (error) {
            toast.error(error?.message);
        }
    };

    return (
        <div className="relative overflow-auto">
            <Tabs
                options={Object.keys(ppcPages)}
                selectedFactory={selectedPage}
                handleFactoryChange={handleSelectPage}
                tabClassName={"mb-2"}
            />

            <div className="w-full">
                <div className="shadow-lg w-full shadow-black/20 rounded-lg inline-block relative">
                    <div className="rounded-lg z-100 flex flex-col gap-2 sticky -top-8 bg-base-200">
                        <div className="text-sm text-base-content/70 space-y-1">
                            <div>
                                <span className="font-semibold">Telford</span> —
                                whether the package belongs to Telford.
                                Non-Telford packages (No) are excluded from
                                production line assignment entirely and will
                                have no PL on WIP records.
                            </div>
                            <div>
                                <span className="font-semibold">
                                    Default PL
                                </span>{" "}
                                — the production line assigned to this package
                                when no specific rule matches. Can be PL1, PL6,
                                or none.
                            </div>
                            <div>
                                <span className="font-semibold">Active</span> —
                                soft-delete toggle. Inactive records are ignored
                                by the resolver but kept for reference. Does not
                                affect already-inserted WIP rows.
                            </div>
                            <div className="bg-warning text-warning-content">
                                Changes here only affect future WIP imports.
                                Existing WIP rows retain their resolved
                                production line at the time of insertion.
                            </div>
                        </div>
                        <div className="flex justify-between items-center gap-2 px-2">
                            <div className="flex gap-2 sticky left-0 items-center w-full">
                                <div className="flex px-2 justify-between items-center gap-2">
                                    <div className="flex gap-2 sticky left-0 items-center">
                                        <MaxItemDropdown
                                            maxItem={maxItem}
                                            changeMaxItemPerPage={
                                                changeMaxItemPerPage
                                            }
                                            buttomClassName="w-35"
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-error btn-ghost btn-square"
                                            disabled={
                                                Object.keys(
                                                    table.getState()
                                                        .rowSelection,
                                                ).length === 0
                                            }
                                            onClick={() =>
                                                deleteModalRef.current.open()
                                            }
                                        >
                                            <MdOutlineDelete className="w-full h-full" />
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleSaveClick}
                                            disabled={
                                                Object.keys(editedRows)
                                                    .length === 0
                                            }
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={handleResetChanges}
                                        >
                                            Reset
                                        </button>
                                    </div>

                                    <div className="flex gap-2 sticky right-0">
                                        <ChangeReviewModal
                                            modalID={saveChangeIDModal}
                                            changes={changes}
                                            onClose={() =>
                                                document
                                                    .getElementById(
                                                        saveChangeIDModal,
                                                    )
                                                    .close()
                                            }
                                            onSave={async () => {
                                                await mutatePackage(
                                                    route(
                                                        "api.pl-ref.master.bulkUpdate",
                                                    ),
                                                    {
                                                        method: "PATCH",
                                                        body: editedRows,
                                                    },
                                                );
                                                document
                                                    .getElementById(
                                                        saveChangeIDModal,
                                                    )
                                                    .close();
                                                toast.success(
                                                    "Packages updated successfully!",
                                                );
                                                refresh();
                                            }}
                                            isLoading={isMutateLoading}
                                        />
                                    </div>
                                </div>
                                <div className="w-full flex gap-1 justify-between">
                                    <SearchInput
                                        initialSearchInput={searchInput}
                                        onSearchChange={setSearchInput}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => handleAddNewRow()}
                                    >
                                        <FaPlus className="mr-2" />
                                        Add Package
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-2 w-full">
                            <BulkErrors errors={mutateErrorData?.data || []} />
                        </div>
                    </div>

                    <Pagination
                        links={serverPackages.links}
                        currentPage={currentPage}
                        goToPage={goToPage}
                        filteredTotal={filteredTotal}
                        overallTotal={overallTotal}
                        start={start}
                        end={end}
                    />
                    <TanstackTable table={table} />
                </div>
            </div>

            <DeleteModal
                ref={deleteModalRef}
                id="ppcMasterDeleteModal"
                message="Are you sure you want to delete these package/s?"
                errorMessage={deleteErrorMessage}
                isLoading={isDeleteLoading}
                onDelete={handleDelete}
                onCancel={deleteCancel}
                onClose={() => deleteModalRef.current?.close()}
            />
        </div>
    );
}

export default PpcPackageMasterPage;
