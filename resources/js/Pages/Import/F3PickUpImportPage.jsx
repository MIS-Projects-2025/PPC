import Collapse from "@/Components/Collapse";
import FileUploader from "@/Components/FileUploader";
import Modal from "@/Components/Modal";
import DataTable from "@/Components/Table";
import { F3_PICKUP_HEADERS } from "@/Constants/ExcelHeaders";
import { useDownloadFile } from "@/Hooks/useDownload";
import { useMutation } from "@/Hooks/useMutation";
import { useImportTraceStore } from "@/Store/importTraceStore";
import { runAsyncToast } from "@/Utils/runAsyncToast";
import { router } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { MdWarning } from "react-icons/md";
import ImportLabel from "../../Components/lastImportLabel";
import ImportPageLayout from "../../Layouts/ImportPageLayout";
import AlreadyExistsModal from "./AlreadyExistsPickupWarningModal";

const F3PickUpImportPage = () => {
    const {
        data: importTraceData,
        isLoading: isImportTraceLoading,
        fetchAllImports,
    } = useImportTraceStore();

    const uploaderPickUpRef = useRef(null);
    const manualPickUpImportRef = useRef(null);
    const [selectedPickUpFile, setSelectedPickUpFile] = useState(null);
    const alreadyExistsModalRef = useRef(null);

    const pickUpLabel = "PickUPs";

    const {
        download,
        isLoading: isDownloadLoading,
        errorMessage,
    } = useDownloadFile();

    const handleDownloadPickUpTemplate = () => {
        download(route("api.download.downloadF3PickUpTemplate"));
    };

    const {
        isLoading: isImportF3PickUpLoading,
        errorMessage: importF3PickUpErrorMessage,
        errorData: importF3PickUpErrorData,
        mutate: importF3PickUp,
        data: importF3PickUpData,
        cancel: importF3PickUpCancel,
    } = useMutation();

    const handleManualPickUpImport = async (allowDuplicate = false) => {
        if (!selectedPickUpFile) {
            return;
        }
        const formData = new FormData();
        formData.append("file", selectedPickUpFile);
        formData.append("isAllowDuplicate", allowDuplicate ? "1" : "0");
        runAsyncToast({
            action: async () => {
                const result = await importF3PickUp(
                    route("import.importF3PickUp"),
                    {
                        body: formData,
                        isContentTypeInclude: false,
                        isFormData: true,
                    },
                );

                await fetchAllImports();

                return result;
            },
            loadingMessage: "Importing PickUp data...",
            renderSuccess: (result) => (
                <>
                    <div className="mb-2 font-bold">
                        F3 PickUps: Successfully imported!
                    </div>

                    <div className="flex flex-col justify-between">
                        <div className="flex gap-2 px-2">
                            <span className="font-light">
                                new F3 pickup entries:
                            </span>
                            <span className="font-bold">
                                {Number(
                                    result?.data?.total ?? 0,
                                ).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </>
            ),

            errorMessage: importF3PickUpErrorMessage,
        });
    };

    const uniquePackages = useMemo(() => {
        const map = new Map();
        for (const item of importF3PickUpErrorData?.data
            ?.ignored_unknown_package ?? []) {
            if (!map.has(item.raw_package)) {
                map.set(item.raw_package, item);
            }
        }
        return [...map.values()];
    }, [importF3PickUpErrorData?.data?.ignored_unknown_package]);

    const uniquePartnames = useMemo(() => {
        const map = new Map();
        for (const item of importF3PickUpData?.data?.ignored_unknown_partname ??
            []) {
            if (!map.has(item.devicename)) {
                map.set(item.devicename, {
                    ...item,
                });
            }
        }
        return [...map.values()];
    }, [importF3PickUpData?.data?.ignored_unknown_partname]);

    const handlePartnameNavigate = () => {
        router.visit(route("partname.createManyPrefill"), {
            method: "post",
            data: {
                parts: uniquePartnames ?? [],
            },
        });
    };

    useEffect(() => {
        if (importF3PickUpErrorData?.data?.already_exists?.length > 0) {
            alreadyExistsModalRef.current?.open();
        }
    }, [importF3PickUpErrorData]);

    return (
        <ImportPageLayout pageName="F3 PickUp">
            <div className="grid grid-cols-1 w-full gap-4">
                <div className="card flex-1 bg-base-100 border border-base-content/20">
                    <div className="card-body">
                        <h2 className="card-title">
                            Upload Daily {pickUpLabel}
                        </h2>
                        <p>
                            Upload latest data for F3 PickUps. If atleast one
                            row's package is unknown, the import will fail. Rows
                            with unknown partnames will still be imported
                            provided their packages are known.
                        </p>

                        {importF3PickUpData?.data?.ignored_unknown_partname
                            ?.length > 0 && (
                            <div className="flex gap-2 items-center justify-between border text-base-content p-2 rounded-lg">
                                <span>
                                    <MdWarning className="inline w-4 h-4 mr-2" />
                                    {
                                        importF3PickUpData?.data
                                            ?.ignored_unknown_partname?.length
                                    }{" "}
                                    partname/s were not recognized.
                                </span>
                                <button
                                    type="button"
                                    onClick={handlePartnameNavigate}
                                    className="btn btn-secondary"
                                >
                                    <div className="inline-grid *:[grid-area:1/1]">
                                        <div className="status status-secondary animate-ping"></div>
                                        <div className="status status-secondary"></div>
                                    </div>
                                    Add the unknown partnames now
                                    <FaExternalLinkAlt className="inline w-4 h-4 ml-1" />
                                </button>
                            </div>
                        )}

                        {importF3PickUpErrorData?.data?.ignored_unknown_package
                            ?.length > 0 && (
                            <div className="bg-error items-center text-error-content p-2 rounded-lg">
                                <MdWarning className="inline w-4 h-4 mr-2" />
                                FAILED TO IMPORT: Some rows' package are unknown
                                (see the unknown package list below)
                                <a
                                    href={route("f3.raw.package.createMany", {
                                        raw_packages: uniquePackages ?? [],
                                    })}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mx-1 btn btn-secondary"
                                >
                                    <div className="inline-grid *:[grid-area:1/1]">
                                        <div className="status status-secondary animate-ping"></div>
                                        <div className="status status-secondary"></div>
                                    </div>
                                    Add the unknown packages now
                                    <FaExternalLinkAlt className="inline w-4 h-4 ml-1" />
                                </a>
                                then you can try importing the file again.
                            </div>
                        )}
                        <ImportLabel
                            data={importTraceData?.f3_pickup}
                            loading={isImportTraceLoading}
                        />
                        <div className="card-actions justify-end">
                            <Modal
                                ref={manualPickUpImportRef}
                                id="pickUpImportModal"
                                title={`Confirm upload ${pickUpLabel} import`}
                                onClose={() =>
                                    manualPickUpImportRef.current?.close()
                                }
                                className="max-w-lg"
                            >
                                <p className="py-4">
                                    Are you sure? This will start the{" "}
                                    {pickUpLabel} import. Current import
                                    progress (if any) will block this action.
                                </p>

                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-soft btn-warning"
                                        onClick={async () => {
                                            manualPickUpImportRef.current?.close();
                                            handleManualPickUpImport();
                                        }}
                                        disabled={isImportF3PickUpLoading}
                                    >
                                        {isImportF3PickUpLoading && (
                                            <span className="loading loading-spinner"></span>
                                        )}
                                        Proceed
                                    </button>

                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() =>
                                            manualPickUpImportRef.current?.close()
                                        }
                                        disabled={isImportF3PickUpLoading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </Modal>
                        </div>
                        <FileUploader
                            ref={uploaderPickUpRef}
                            legend="Pick an Excel file"
                            onFileValid={(file) => {
                                setSelectedPickUpFile(file);
                            }}
                            downloadClick={handleDownloadPickUpTemplate}
                            isDownloadLoading={isDownloadLoading}
                        />
                        {importF3PickUpErrorData?.data?.already_exists?.length >
                            0 && (
                            <AlreadyExistsModal
                                ref={alreadyExistsModalRef}
                                data={
                                    importF3PickUpErrorData?.data
                                        ?.already_exists ?? []
                                }
                                onRefetch={() => handleManualPickUpImport(true)}
                                loading={isImportF3PickUpLoading}
                                abort={importF3PickUpCancel}
                            />
                        )}
                        <button
                            type="button"
                            className="btn btn-primary w-54"
                            onClick={() =>
                                manualPickUpImportRef.current?.open()
                            }
                            disabled={
                                isImportF3PickUpLoading || !selectedPickUpFile
                            }
                        >
                            Upload {pickUpLabel}
                        </button>
                    </div>

                    {importF3PickUpData?.data?.ignored_unknown_partname_count >
                        0 && (
                        <Collapse
                            title={`Unknown Partname: Click to see details.`}
                            className={
                                "w-full border border-warning text-base-content"
                            }
                            contentClassName={
                                "overflow-x-auto text-base-content"
                            }
                        >
                            <div className="mb-2 ">
                                showing{" "}
                                {
                                    importF3PickUpData?.data
                                        ?.ignored_unknown_partname_count
                                }{" "}
                                out of{" "}
                                {
                                    importF3PickUpData?.data
                                        ?.ignored_unknown_partname_count
                                }
                            </div>
                            <div className="overflow-x-auto w-full max-h-96">
                                <DataTable
                                    columns={Object.keys(
                                        importF3PickUpData?.data
                                            ?.ignored_unknown_partname[0],
                                    )}
                                    rows={
                                        importF3PickUpData?.data
                                            ?.ignored_unknown_partname
                                    }
                                    className={"w-full"}
                                />
                            </div>
                        </Collapse>
                    )}

                    {importF3PickUpErrorData?.data
                        ?.ignored_unknown_package_count > 0 && (
                        <Collapse
                            title={`Unknown Package. Click to see details.`}
                            className={
                                "w-full border border-warning text-base-content"
                            }
                            contentClassName={
                                "overflow-x-auto text-base-content"
                            }
                        >
                            <div className="mb-2 ">
                                showing{" "}
                                {
                                    importF3PickUpErrorData?.data
                                        ?.ignored_unknown_package_count
                                }{" "}
                                out of{" "}
                                {
                                    importF3PickUpErrorData?.data
                                        ?.ignored_unknown_package_count
                                }
                            </div>
                            <div className="overflow-x-auto w-full max-h-96">
                                <DataTable
                                    columns={Object.keys(
                                        importF3PickUpErrorData?.data
                                            ?.ignored_unknown_package[0],
                                    )}
                                    rows={
                                        importF3PickUpErrorData?.data
                                            ?.ignored_unknown_package
                                    }
                                    className={"w-full"}
                                />
                            </div>
                        </Collapse>
                    )}

                    {importF3PickUpErrorMessage &&
                        (importF3PickUpErrorData?.data?.missing_headers ||
                            importF3PickUpErrorData?.data?.unknown_headers) && (
                            <Collapse
                                title={`${importF3PickUpErrorMessage}. Click to see details.`}
                                className={
                                    "border-red-500 hover:border-red-500 bg-error/10"
                                }
                            >
                                {importF3PickUpErrorData?.data?.missing_headers
                                    ?.length > 0 && (
                                    <div className="mt-2">
                                        Missing headers:{" "}
                                    </div>
                                )}
                                <ul className="list">
                                    {importF3PickUpErrorData?.data?.missing_headers?.map(
                                        (missing) => (
                                            <li
                                                className="list-row h-8 leading-none"
                                                key={missing}
                                            >
                                                {missing}
                                            </li>
                                        ),
                                    )}
                                </ul>
                                {importF3PickUpErrorData?.data?.unknown_headers
                                    ?.length > 0 && (
                                    <div className="mt-2">
                                        Unknown (ignored):{" "}
                                    </div>
                                )}
                                <ul className="list">
                                    {importF3PickUpErrorData?.data?.unknown_headers?.map(
                                        (unknown) => (
                                            <li
                                                className="list-row h-8 leading-none"
                                                key={unknown}
                                            >
                                                {unknown}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </Collapse>
                        )}

                    <Collapse title={`${pickUpLabel} Excel Headers Required`}>
                        <div className="text-secondary">
                            space and whitespace are the same. Case insensitive
                        </div>
                        <ul className="list">
                            {F3_PICKUP_HEADERS.map((header) => (
                                <li
                                    className="list-row h-8 leading-none"
                                    key={header}
                                >
                                    {header}
                                </li>
                            ))}
                        </ul>
                    </Collapse>
                </div>
            </div>
        </ImportPageLayout>
    );
};

export default F3PickUpImportPage;
