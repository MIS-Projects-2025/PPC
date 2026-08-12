import MaxItemDropdown from "@/Components/MaxItemDropdown";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import SearchInput from "@/Components/SearchInput";
import Tabs from "@/Components/Tabs";
import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import formatFriendlyDate from "@/Utils/formatFriendlyDate";
import { Link, router, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import { TbAlertCircle } from "react-icons/tb";

const F3RawPackageList = () => {
    const toast = useToast();
    const {
        f3RawPackages: serverF3RawPackages,
        search: serverSearch,
        perPage: serverPerPage,
        totalEntries,
    } = usePage().props;

    const start = serverF3RawPackages.from;
    const end = serverF3RawPackages.to;
    const filteredTotal = serverF3RawPackages.total;
    const overallTotal = totalEntries ?? filteredTotal;
    const deleteModalRef = useRef(null);
    const [searchInput, setSearchInput] = useState(serverSearch || "");
    const [maxItem, setMaxItem] = useState(serverPerPage || 50);
    const [selectedRawPackage, setSelectedRawPackage] = useState(null);
    const [currentPage, setCurrentPage] = useState(
        serverF3RawPackages.current_page || 1,
    );

    const {
        mutate,
        isLoading: isMutateLoading,
        errorMessage: mutateErrorMessage,
        cancel: mutateCancel,
    } = useMutation();

    useEffect(() => {
        if (serverSearch === searchInput) return;

        const timer = setTimeout(() => {
            router.reload({
                data: { search: searchInput, perPage: maxItem, page: 1 },
            });
            setCurrentPage(1);
        }, 700);

        return () => clearTimeout(timer);
    }, [searchInput]);

    const goToPage = (page) => {
        router.reload({
            data: { search: searchInput, perPage: maxItem, page },
        });
        setCurrentPage(page);
    };

    const changeMaxItemPerPage = (maxItem) => {
        router.reload({
            data: { search: searchInput, perPage: maxItem, page: 1 },
        });
        setMaxItem(maxItem);
    };

    const refresh = () => {
        router.reload({
            data: { search: searchInput, perPage: maxItem, currentPage },
        });
    };

    const handleDelete = async () => {
        try {
            await mutate(
                route("api.f3.raw.package.delete", {
                    id: selectedRawPackage.id,
                }),
                {
                    method: "DELETE",
                },
            );

            refresh();

            deleteModalRef.current.close();
            toast.success("Raw Package deleted successfully!");
        } catch (error) {
            toast.error(error.message || "Something went wrong");
            console.error(error);
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between text-center">
                <Tabs
                    options={["F3 Raw Packages", "F3 Packages"]}
                    selectedFactory={"F3 Raw Packages"}
                    handleFactoryChange={() =>
                        router.visit(route("f3.package.index"))
                    }
                />

                <div className="flex gap-2">
                    <Link
                        href={route("f3.raw.package.create")}
                        className="btn btn-primary"
                    >
                        <FaPlus /> Add a F3 Raw Package
                    </Link>
                    <Link
                        href={route("f3.raw.package.createMany")}
                        className="btn btn-primary"
                    >
                        <FaPlus /> Add Many F3 Raw Packages
                    </Link>
                </div>
            </div>

            <div className="flex justify-between py-4">
                <MaxItemDropdown
                    maxItem={maxItem}
                    changeMaxItemPerPage={changeMaxItemPerPage}
                />
                <SearchInput
                    initialSearchInput={searchInput}
                    onSearchChange={setSearchInput}
                />
            </div>

            <table className="table w-full table-auto table-xs">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Raw Package Name</th>
                        <th>Lead Count</th>
                        <th>Package</th>
                        <th>Dimension</th>
                        <th>Added By</th>
                        <th>Created at</th>
                        <th>Updated at</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {serverF3RawPackages.data.map((rawPackage) => (
                        <tr key={rawPackage.id}>
                            <td>{rawPackage.id}</td>
                            <td>{rawPackage.raw_package}</td>
                            <td>{rawPackage?.lead_count || "-"}</td>
                            <td>
                                {rawPackage?.f3_package_name?.package_name ||
                                    "-"}
                            </td>
                            <td>{rawPackage?.dimension || "-"}</td>
                            <td>{rawPackage?.added_by || "-"}</td>
                            <td>
                                {formatFriendlyDate(rawPackage?.created_at) ||
                                    "-"}
                            </td>
                            <td>
                                {formatFriendlyDate(rawPackage?.updated_at) ||
                                    "-"}
                            </td>
                            <td className="flex flex-col lg:flex-row">
                                <a
                                    href={route("f3.raw.package.edit", {
                                        id: rawPackage.id,
                                        search: searchInput,
                                        perPage: maxItem,
                                        page: currentPage,
                                    })}
                                    className="btn btn-ghost btn-sm btn-primary"
                                >
                                    <FaEdit />
                                </a>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm text-error"
                                    onClick={() => {
                                        setSelectedRawPackage(rawPackage);
                                        deleteModalRef.current.open();
                                    }}
                                >
                                    <FaTrash />
                                </button>

                                <Modal
                                    ref={deleteModalRef}
                                    id="deleteF3RawPackageModal"
                                    title="Are you sure?"
                                    onClose={() =>
                                        deleteModalRef.current?.close()
                                    }
                                    className="max-w-lg"
                                >
                                    <p className="px-2 pt-4">
                                        This action cannot be undone. Delete
                                        <span className="pl-1 text-error">
                                            {selectedRawPackage?.raw_package ||
                                                "this?"}
                                        </span>
                                        <span>?</span>
                                        <div className="flex items-center text-error gap-2">
                                            <TbAlertCircle />
                                            Anything that uses this package in
                                            F3 WIP database will be deleted.
                                        </div>
                                    </p>

                                    <p
                                        className="p-2 border rounded-lg bg-error/10 text-error"
                                        style={{
                                            visibility: mutateErrorMessage
                                                ? "visible"
                                                : "hidden",
                                        }}
                                    >
                                        {mutateErrorMessage || "placeholder"}
                                    </p>

                                    <div className="flex justify-end gap-2 pt-4">
                                        <button
                                            type="button"
                                            className="btn btn-error"
                                            onClick={async () => {
                                                await handleDelete();
                                            }}
                                            disabled={isMutateLoading}
                                        >
                                            {isMutateLoading ? (
                                                <>
                                                    <span className="loading loading-spinner"></span>{" "}
                                                    Deleting
                                                </>
                                            ) : (
                                                "Confirm Delete"
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={() =>
                                                deleteModalRef.current?.close()
                                            }
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </Modal>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <Pagination
                links={serverF3RawPackages.links}
                currentPage={currentPage}
                goToPage={goToPage}
                filteredTotal={filteredTotal}
                overallTotal={overallTotal}
                start={start}
                end={end}
                contentClassName="bg-base-200"
            />
        </div>
    );
};

export default F3RawPackageList;
