import BulkErrors from "@/Components/BulkErrors";
import DropdownCell from "@/Components/tanStackTable/DropdownCell";
import ReadOnlyColumns from "@/Components/tanStackTable/ReadOnlyColumn";
import TanstackTable from "@/Components/tanStackTable/TanstackTable";
import { useEditableTable } from "@/Hooks/useEditableTable";
import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import { router, usePage } from "@inertiajs/react";
import React, { useCallback, useMemo } from "react";
import { FaPlus, FaSave } from "react-icons/fa";
import { MdOutlineDelete } from "react-icons/md";

const plOptions = ["PL1", "PL6"];

const PartNameMultiInsert = () => {
    const toast = useToast();
    const { parts: serverParts } = usePage().props;

    const initialPartnames = useMemo(() => {
        if (serverParts?.length) {
            return serverParts.map((p, index) => ({
                devicename: p.devicename || "",
                focus_grp: p.focus_grp || "",
                areas: p.areas || "",
                productline: p.productline || "PL1",
                package_type: p.package_type || "",
                lead_count: p.lead_count || "",
                dimensions: p.dimensions || "",
                allocation: p.allocation || "",
                generic_name: p.generic_name || "",
                drypack: p.drypack || "",
                recipe: p.recipe ?? "",
                id: `new-${index}`,
            }));
        }

        return [];
    }, [serverParts]);

    const {
        mutate,
        isLoading: isMutateLoading,
        errorMessage: mutateErrorMessage,
        errorData: mutateErrorData,
    } = useMutation();

    const handleCellChange = useCallback((rowIndex, columnId, value) => {
        setData((prevData) => {
            if (prevData[rowIndex][columnId] === value) {
                return prevData;
            }
            const newData = [...prevData];
            newData[rowIndex] = { ...newData[rowIndex], [columnId]: value };

            const rowId = newData[rowIndex].id;

            setEditedRows((prev) => ({
                ...prev,
                [rowId]: {
                    ...prev[rowId],
                    [columnId]: value,
                },
            }));

            return newData;
        });
    }, []);

    const plColumn = React.useMemo(
        () => ({
            accessorKey: "productline",
            header: "PL",
            size: 100,
            cell: React.memo(({ getValue, row, column }) => {
                const value = getValue();

                return (
                    <div className="w-full">
                        <DropdownCell
                            statusOptions={plOptions}
                            value={value}
                            rowIndex={row.index}
                            columnId={column.id}
                            onChange={handleCellChange}
                        />
                    </div>
                );
            }),
        }),
        [],
    );

    const columns = React.useMemo(
        () => [
            ReadOnlyColumns({
                accessorKey: "id",
                header: "ID",
                options: {
                    size: 60,
                    enableHiding: false,
                    meta: { hidden: true },
                },
            }),
            {
                accessorKey: "devicename",
                header: "Partname",
                type: "string",
                size: 150,
            },
            {
                accessorKey: "focus_grp",
                header: "Focus Group",
                type: "string",
                size: 120,
            },
            {
                accessorKey: "areas",
                header: "Factory",
                type: "string",
                size: 100,
            },
            plColumn,
            {
                accessorKey: "package_type",
                header: "Packagename",
                type: "string",
                size: 150,
            },
            {
                accessorKey: "lead_count",
                header: "Leadcount",
                type: "string",
                size: 100,
            },
            {
                accessorKey: "dimensions",
                header: "Bodysize",
                type: "string",
                size: 120,
            },
            {
                accessorKey: "allocation",
                header: "Allocation",
                type: "string",
                size: 120,
            },
            {
                accessorKey: "generic_name",
                header: "Generic Name",
                type: "string",
                size: 120,
            },
            {
                accessorKey: "drypack",
                header: "Drypack",
                type: "string",
                size: 100,
            },
            {
                accessorKey: "recipe",
                header: "Recipe",
                type: "number",
                size: 90,
            },
        ],
        [],
    );

    const {
        table,
        data,
        setData,
        setEditedRows,
        handleAddNewRow,
        handleDeleteRow,
        handleResetChanges,
        editedRows,
    } = useEditableTable(initialPartnames || [], columns, {
        createEmptyRow: () => ({
            devicename: "",
            focus_grp: "",
            areas: "",
            productline: "PL1",
            package_type: "",
            lead_count: "",
            dimensions: "",
            allocation: "",
            generic_name: "",
            drypack: "",
            recipe: "",
        }),
        isMultipleSelection: true,
    });

    const handleUpsert = async (e) => {
        e.preventDefault();

        const url = route("api.partname.bulkUpdate");
        const method = "PATCH";

        try {
            await mutate(url, { method, body: data });
            toast.success("Parts created successfully!");
            router.visit(route("partname.index"));
        } catch (err) {
            console.error("Upsert failed:", err?.message);
            toast.error(err?.message);
        }
    };

    const handleDelete = async () => {
        const rowIds = Object.keys(table.getState().rowSelection);
        handleDeleteRow(rowIds);
    };

    return (
        <>
            <h1 className="text-base font-bold mb-4">Add New Partname</h1>

            <form onSubmit={handleUpsert}>
                <div className="flex gap-2 mt-4">
                    <button
                        type="button"
                        onClick={() => handleAddNewRow()}
                        className="btn btn-outline btn-accent"
                    >
                        <FaPlus /> Add Row
                    </button>
                    <button
                        type="button"
                        onClick={handleResetChanges}
                        className="btn btn-outline btn-error"
                    >
                        Reset
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isMutateLoading}
                    >
                        {isMutateLoading ? (
                            <span className="loading loading-spinner"></span>
                        ) : (
                            <FaSave />
                        )}
                        Save All
                    </button>
                    <div className="px-2 w-full">
                        {<BulkErrors errors={mutateErrorData?.data || []} />}
                    </div>
                    <button
                        type="button"
                        className="btn btn-error btn-ghost btn-square"
                        disabled={
                            Object.keys(table.getState().rowSelection)
                                .length === 0
                        }
                        onClick={handleDelete}
                    >
                        <MdOutlineDelete className="w-full h-full" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <TanstackTable table={table} />
                </div>
            </form>
        </>
    );
};

export default PartNameMultiInsert;
