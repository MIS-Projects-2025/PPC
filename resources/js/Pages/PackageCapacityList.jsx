import Tabs from "@/Components/Tabs";
import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import formatFriendlyDate from "@/Utils/formatFriendlyDate";
import { Link, router, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { BsInfoCircle } from "react-icons/bs";

const PackageCapacityList = () => {
    const toast = useToast();

    const { summary: serverPackageCapacity, factory: initialFactory } =
        usePage().props;

    const importCapacityModalRef = useRef(null);
    const [selectedPackageCapacity, setSelectedPackageCapacity] =
        useState(null);
    const packageGroupIndexPageRoute = route("package.capacity.index");
    const [selectedFactory, setSelectedFactory] = useState(initialFactory);

    const {
        mutate,
        isLoading: isMutateLoading,
        errorMessage: mutateErrorMessage,
        cancel: mutateCancel,
    } = useMutation();

    useEffect(() => {
        if (initialFactory === selectedFactory) return;

        const timer = setTimeout(() => {
            router.reload({
                data: { factory: selectedFactory },
                preserveState: true,
                preserveScroll: true,
            });
        }, 100);

        return () => clearTimeout(timer);
    }, [selectedFactory]);

    const refresh = () => {
        router.reload({
            data: { factory: selectedFactory },
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDelete = async () => {
        try {
            await mutate(
                route("api.package.group.delete", {
                    id: selectedPackageCapacity.ppc_partnamedb_id,
                }),
                {
                    method: "DELETE",
                },
            );

            refresh();

            importCapacityModalRef.current.close();
            toast.success("Part deleted successfully!");
        } catch (error) {
            toast.error(error.message || "Something went wrong");
            console.error(error);
        }
    };

    const handleFactoryChange = (selectedFactory) => {
        setSelectedFactory(selectedFactory);
    };

    const table = (
        <table className="table w-full table-auto table-xs">
            <thead>
                <tr>
                    <th>Package Name</th>
                    <th>Previous Capacity</th>
                    <th>Latest Capacity</th>
                </tr>
            </thead>
            <tbody>
                {serverPackageCapacity?.map((packageGroup, idx) => (
                    <tr key={idx}>
                        <td>{packageGroup.package_name}</td>

                        <td>
                            <span className="font-mono text-right w-15 inline-block">
                                {packageGroup?.previous_capacity?.toLocaleString() ||
                                    "-"}
                            </span>{" "}
                            (
                            <span className="opacity-50">
                                {formatFriendlyDate(
                                    packageGroup?.previous_from || "",
                                )}
                            </span>
                            )
                        </td>

                        <td>
                            <span className="font-mono text-right w-15 inline-block">
                                {packageGroup?.latest_capacity?.toLocaleString() ||
                                    "-"}
                            </span>{" "}
                            (
                            <span className="opacity-50">
                                {formatFriendlyDate(
                                    packageGroup?.latest_from || "",
                                )}
                            </span>
                            )
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <>
            <div className="flex mb-4 items-center justify-between text-center">
                <Tabs
                    options={["Package Capacity List", "Upload New Capacity"]}
                    selectedFactory={"Package Capacity List"}
                    handleFactoryChange={() => {
                        router.visit(route("package.capacity.upload.index"));
                    }}
                />
                {/* <Modal
                    ref={importCapacityModalRef}
                    id="PackageCapacityDeleteModal"
                    title="Import New Capacity"
                    onClose={() => importCapacityModalRef.current?.close()}
                    className="max-w-lg"
                >
                    <p className="px-2 pt-4">
                        <span className="font-bold">Note:</span>
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
                            className="btn btn-outline"
                            onClick={() =>
                                importCapacityModalRef.current?.close()
                            }
                        >
                            Cancel
                        </button>
                    </div>
                </Modal> */}
            </div>
            <div className="bg-base-300 p-4 rounded-lg">
                <BsInfoCircle className="inline mb-1 mr-2" />
                All Package names in this list should also be included in the
                <Link
                    href={route("package.group.index")}
                    className="underline text-secondary px-1"
                >
                    Package Group Page
                </Link>
                .
            </div>

            <Tabs
                options={["F1", "F2", "F3"]}
                selectedFactory={selectedFactory}
                handleFactoryChange={handleFactoryChange}
                tabClassName={"ml-2"}
            />

            <div className="border rounded-lg border-base-content/10 p-4">
                {(serverPackageCapacity?.length ?? 0) === 0 ? (
                    <p className="italic text-center">
                        No package capacity yet for the {selectedFactory} yet.
                    </p>
                ) : (
                    table
                )}
            </div>
        </>
    );
};

export default PackageCapacityList;
