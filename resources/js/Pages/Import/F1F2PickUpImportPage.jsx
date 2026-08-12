import Collapse from "@/Components/Collapse";
import FileUploader from "@/Components/FileUploader";
import Modal from "@/Components/Modal";
import DataTable from "@/Components/Table";
import { PICKUP_HEADERS } from "@/Constants/ExcelHeaders";
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

const F1F2PickUpImportPage = () => {
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
        download(route("api.download.downloadPickUpTemplate"));
    };

    const {
        isLoading: isImportPickUpLoading,
        errorMessage: importPickUpErrorMessage,
        errorData: importPickUpErrorData,
        mutate: importPickUp,
        data: importPickUpData,
        cancel: importPickUpCancel,
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
                const result = await importPickUp(
                    route("import.importPickUp"),
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
                    <div className="mb-2 font-bold text-success">
                        <span>PickUps: </span>{" "}
                        {result?.message || "Successfully imported!"}
                    </div>

                    <div className="flex justify-between">
                        <span className="font-light">new PickUp entries:</span>
                        <span className="font-bold">
                            {Number(result?.data?.total ?? 0).toLocaleString()}
                        </span>
                    </div>
                </>
            ),
            errorMessage: importPickUpErrorMessage,
        });
    };

    const uniquePartnames = useMemo(() => {
        const map = new Map();
        for (const item of importPickUpData?.data?.ignored_unknown_partname ??
            []) {
            if (!map.has(item.devicename)) {
                map.set(item.devicename, {
                    ...item,
                });
            }
        }
        return [...map.values()];
    }, [importPickUpData?.data?.ignored_unknown_partname]);

    const handlePartnameNavigate = () => {
        router.visit(route("partname.createManyPrefill"), {
            method: "post",
            data: {
                parts: uniquePartnames ?? [],
            },
        });
    };

    useEffect(() => {
        if (importPickUpErrorData?.data?.already_exists?.length > 0) {
            alreadyExistsModalRef.current?.open();
        }
    }, [importPickUpErrorData]);

    return (
        <ImportPageLayout pageName="F1/F2 PickUp">
            <div className="grid grid-cols-1 w-full gap-4">
                <div className="card flex-1 bg-base-100 border border-base-content/20">
                    <div className="card-body">
                        <h2 className="card-title">
                            Upload Daily {pickUpLabel}
                        </h2>
                        <p>Upload latest data for F1/F2 PickUps.</p>

                        {importPickUpData?.data?.ignored_unknown_partname
                            ?.length > 0 && (
                            <div className="flex gap-2 items-center justify-between border text-base-content p-2 rounded-lg">
                                <span>
                                    <MdWarning className="inline w-4 h-4 mr-2" />
                                    {
                                        importPickUpData?.data
                                            ?.ignored_unknown_partname?.length
                                    }{" "}
                                    partname/s were not recognized.
                                </span>
                                <button
                                    type="button"
                                    onClick={handlePartnameNavigate}
                                    className="btn btn-outline btn-primary"
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

                        <ImportLabel
                            data={importTraceData?.pickup}
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
                                        disabled={isImportPickUpLoading}
                                    >
                                        {isImportPickUpLoading && (
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
                                        disabled={isImportPickUpLoading}
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
                        {importPickUpErrorData?.data?.already_exists?.length >
                            0 && (
                            <AlreadyExistsModal
                                ref={alreadyExistsModalRef}
                                data={
                                    importPickUpErrorData?.data
                                        ?.already_exists ?? []
                                }
                                onRefetch={() => handleManualPickUpImport(true)}
                                loading={isImportPickUpLoading}
                                abort={importPickUpCancel}
                            />
                        )}
                        <button
                            type="button"
                            className="btn btn-primary w-54"
                            onClick={() =>
                                manualPickUpImportRef.current?.open()
                            }
                            disabled={
                                isImportPickUpLoading || !selectedPickUpFile
                            }
                        >
                            Upload {pickUpLabel}
                        </button>
                    </div>

                    {importPickUpData?.data?.ignored_unknown_partname_count >
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
                                    importPickUpData?.data
                                        ?.ignored_unknown_partname_count
                                }{" "}
                                out of{" "}
                                {
                                    importPickUpData?.data
                                        ?.ignored_unknown_partname_count
                                }
                            </div>
                            <div className="overflow-x-auto w-full max-h-96">
                                <DataTable
                                    columns={Object.keys(
                                        importPickUpData?.data
                                            ?.ignored_unknown_partname[0],
                                    )}
                                    rows={
                                        importPickUpData?.data
                                            ?.ignored_unknown_partname
                                    }
                                    className={"w-full"}
                                />
                            </div>
                        </Collapse>
                    )}

                    {(importPickUpErrorData?.data?.missing_headers?.length ||
                        importPickUpErrorData?.data?.unknown_headers
                            ?.length) && (
                        <Collapse
                            title={`${importPickUpErrorMessage}. Click to see details.`}
                            className="border-red-500 hover:border-red-500 bg-error/10"
                        >
                            {importPickUpErrorData?.data?.missing_headers
                                ?.length > 0 && (
                                <div className="mt-2">
                                    Missing headers:
                                    <ul className="list">
                                        {importPickUpErrorData.data.missing_headers.map(
                                            (missing, index) => (
                                                <li
                                                    className="list-row h-8 leading-none"
                                                    key={`${missing}-${index}`}
                                                >
                                                    {missing}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}
                            {importPickUpErrorData?.data?.unknown_headers
                                ?.length > 0 && (
                                <div className="mt-2">
                                    Unknown (ignored):
                                    <ul className="list">
                                        {importPickUpErrorData.data.unknown_headers.map(
                                            (unknown, index) => (
                                                <li
                                                    className="list-row h-8 leading-none"
                                                    key={`${unknown}-${index}`}
                                                >
                                                    {unknown}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            )}
                        </Collapse>
                    )}

                    <Collapse title={`${pickUpLabel} Excel Headers Required`}>
                        <div className="text-secondary">
                            space and whitespace are the same. Case insensitive
                        </div>
                        <ul className="list">
                            {PICKUP_HEADERS.map((header) => (
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

export default F1F2PickUpImportPage;
