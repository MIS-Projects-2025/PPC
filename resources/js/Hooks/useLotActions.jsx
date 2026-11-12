import { showDidntFitToast } from "@/Components/DidntFitToast";
import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";
import { useToast } from "@/Hooks/useToast";
import { useLotStore } from "@/Store/useLotStore";
import { router } from "@inertiajs/react";
import { useRef, useState } from "react";
import { useMutation } from "./useMutation";

const toastOptions = {
    position: "top-left",
    className: "text-[20px] font-bold w-[300px] p-2",
};

const MAX_QTY = 9999999; // keep in sync with the `max:` rule in LotController

// useLotStore() hands back a snapshot taken at render time. Scanner callbacks fire between
// renders, so reading that snapshot means acting on stale data (e.g. DONE scanned right after
// a slot scan would save WITHOUT that slot). This proxy always reads the live state instead.
const liveStore = new Proxy(
    {},
    { get: (_target, key) => useLotStore.getState()[key] },
);

export const toQty = (value) => {
    const cleaned = String(value ?? "").replace(/[,\s]/g, "");
    if (!/^\d+$/.test(cleaned)) return null;
    const qty = parseInt(cleaned, 10);
    return qty > 0 && qty <= MAX_QTY ? qty : null;
};

const QTY_ERROR = `Error: Quantity must be a whole number from 1 to ${MAX_QTY.toLocaleString()}.`;

const isAbortError = (error) =>
    error?.name === "AbortError" || /aborted/i.test(error?.message ?? "");

// Re-sync lot list, totals and rack occupancy with the DB after any write or failed write.
const refreshServerState = () =>
    router.reload({
        only: [
            "lots",
            "occupancy", "racks",
            "totalEntries",
            "totalReceived",
            // 7. untrackedSlots runs a full snapshot on every page load and every refresh.
            // refreshServerState runs after every write. Either wrap untrackedSummary in Cache::remember("untracked:{$pageId}", 30, ...), 
            // or drop it from the only list and accept a badge that is stale until the next full load.
            // "untrackedSlots",
            "totalReleased",
        ],
        preserveState: true,
        preserveScroll: true,
    });

export function useLotActions() {
    const store = liveStore;
    const toast = useToast();
    const [focusedField, setFocusedFieldState] = useState(
        LOT_UPSTREAM_MODES.FIELD_ORDER[0],
    );
    // Mirrors focusedField so back-to-back scans never act on a stale render.
    const focusedFieldRef = useRef(LOT_UPSTREAM_MODES.FIELD_ORDER[0]);

    const {
        mutate: mutateLot,
        isLoading: isMutateLotLoading,
        errorMessage: mutateLotErrorMessage,
        errorData: mutateLotErrorData,
        cancel: mutateLotCancel,
    } = useMutation();

    const setFocusedField = (field) => {
        focusedFieldRef.current = field;
        setFocusedFieldState(field);
    };

    const advanceFocus = (currentField) => {
        const order = LOT_UPSTREAM_MODES.FIELD_ORDER;
        setFocusedField(order[order.indexOf(currentField) + 1] ?? order[0]);
    };

    const resetFocus = () => {
        setFocusedField(LOT_UPSTREAM_MODES.FIELD_ORDER[0]);
    };

    const fail = (message) => {
        toast.error(message, toastOptions);
        store.setScanResult(LOT_UPSTREAM_MODES.WRONG);
    };

    const flashScanning = () => {
        store.setIsScanning(true);
        setTimeout(() => store.setIsScanning(false), 200);
    };

    const reportFailure = (lotId, error, { toasted = false } = {}) => {
        if (isAbortError(error)) {
            if (!toasted) {
                toast.info(
                    "Cancelled. Checking the server for the final state…",
                    toastOptions,
                );
            }
        } else {
            store.setLotError(lotId, error?.message);
            if (!toasted) {
                toast.error(
                    error?.message || "Something went wrong",
                    toastOptions,
                );
            }
            store.setScanResult(LOT_UPSTREAM_MODES.WRONG);
        }
        // The server may have committed even though the response never arrived.
        refreshServerState();
    };

    const confirmLot = async () => {
        const { pendingLotToBeAdded, slotPendingLot } = store;
        const rec = store.recommendation;
        const lotId = pendingLotToBeAdded?.lot_id?.trim();
        const qty = toQty(pendingLotToBeAdded?.qty);

        if (!lotId) {
            return fail(
                "Error: No lot scanned. Please scan a lot and try again.",
            );
        }
        if (qty === null) return fail(QTY_ERROR);
        if (slotPendingLot.length === 0) {
            return fail(
                "Error: No rack slots selected. Please select at least one rack slot and try again.",
            );
        }
        if (store.lotMutations[lotId]?.isLoading) return;

        const socketId = window.Echo?.socketId();
        const slotIds = slotPendingLot.map((s) => s.id);
        const slotLabels = slotPendingLot
            .map((s) => s.label || s.name)
            .join(", ");

        store.setLotLoading(lotId, true);

        try {
            const result = await mutateLot(route("lot-upstream.store"), {
                cancelPrevious: false, // aborting the fetch cannot abort the server transaction
                method: "POST",
                body: {
                    lot_id: lotId,
                    partname: pendingLotToBeAdded.partname?.trim() || null,
                    qty,
                    slot_ids: slotIds,
                    recommendation_id: rec?.id ?? null, // box facts are read from the source on the server
                },
                additionalHeaders: {
                    ...(socketId && { "X-Socket-ID": socketId }),
                },
            });

            const lot = result?.data?.lot;
            const wasCreated = result?.data?.created;

            toast.success(
                `${wasCreated ? "Added" : "Re-stocked"} ${lotId} → ${slotLabels}`,
                toastOptions,
            );

            // Only when the operator went somewhere else than recommended: that is the only case where
            // "the recommended slot was full" can be true.
            const recommendedSlots = rec?.slots ?? [];
            if (
                !rec?.joins &&
                rec?.id &&
                recommendedSlots.length > 0 &&
                recommendedSlots.some((s) => !slotIds.includes(s.slot_id))
            ) {
                showDidntFitToast({
                    recommendationId: rec.id,
                    labels: recommendedSlots.map((s) => s.label),
                });
            }

            if (lot) {
                if (wasCreated) store.receiveLot(lot);
                else store.updateLot(lot.id, lot);
            }

            store.incrementTotalReceived();
            store.resetAll();
            store.setScanResult(LOT_UPSTREAM_MODES.RECEIVE_SUCCESS);
            refreshServerState();
        } catch (error) {
            reportFailure(lotId, error);
        } finally {
            store.setLotLoading(lotId, false);
        }
    };

    const editLot = async (updatedData) => {
        const lotId = updatedData?.lot_id?.trim();
        const qty = toQty(updatedData?.qty);

        if (!lotId || !updatedData?.id) {
            return fail(
                "Error: Nothing to save. Please reopen the lot and try again.",
            );
        }
        if (qty === null) return fail(QTY_ERROR);
        // Guard BEFORE setting the flag (the old code set it first, then checked it).
        if (store.lotMutations[lotId]?.isLoading) return;

        const socketId = window.Echo?.socketId();
        const partname = updatedData.partname?.trim();

        store.setLotLoading(lotId, true);

        try {
            const result = await mutateLot(
                route(
                    "lot-upstream.update",
                    encodeURIComponent(updatedData.id),
                ),
                {
                    cancelPrevious: false,
                    method: "PATCH",
                    body: {
                        lot_id: lotId,
                        ...(partname ? { partname } : {}),
                        qty,
                        slot_ids: updatedData.slot_ids ?? [],
                    },
                    additionalHeaders: {
                        ...(socketId && { "X-Socket-ID": socketId }),
                    },
                },
            );

            toast.success(
                `You edited ${result?.data?.lot_id ?? lotId}`,
                toastOptions,
            );

            if (result?.data?.id) store.updateLot(result.data.id, result.data);
            store.resetAll();
            // Close only on success so a failed save keeps the operator's edits on screen.
            store.setScanResult(LOT_UPSTREAM_MODES.CLOSE);
            refreshServerState();
        } catch (error) {
            reportFailure(lotId, error);
            console.error(error);
        } finally {
            store.setLotLoading(lotId, false);
        }
    };

    const releaseLot = async (lot) => {
        const target = lot ?? store.lotToBeReleased;
        const lotId = target?.lot_id?.trim();
        const withdrawerId = String(store.withdrawerId ?? "").trim();

        if (!lotId) {
            return fail(
                "Error: No lot scanned. Please scan a lot and try again.",
            );
        }
        if (!withdrawerId) {
            toast.error(
                "Error: Scan or enter the withdrawer ID first.",
                toastOptions,
            );
            return;
        }
        if (store.lotMutations[lotId]?.isLoading) return;

        const socketId = window.Echo?.socketId();

        store.setLotLoading(lotId, true);
        const promise = mutateLot(route("lot-upstream.release"), {
            cancelPrevious: false,
            mutationKey: lotId,
            method: "POST",
            body: { lot_id: lotId, withdrawer_id: withdrawerId, partname: target?.partname || null },
            additionalHeaders: {
                ...(socketId && { "X-Socket-ID": socketId }),
            },
        });

        toast.promise(
            promise,
            {
                loading: "Releasing...",
                success: (res) => {
                    const others = (res?.data?.also_released ?? []).map((l) => l.lot_id);
                    return others.length
                        ? `Released ${lotId} + ${others.join(" + ")}`
                        : `Released ${lotId}`;
                },
                error: (err) =>
                    isAbortError(err)
                        ? "Cancelled. Checking the server for the final state…"
                        : err?.message || "Something went wrong",
            },
            toastOptions,
        );

        try {
            const result = await promise;
            if (result?.data?.id) store.updateLot(result.data.id, result.data);
            // Lots that shared the boxes were released with it.
            const alsoReleased = result?.data?.also_released ?? [];
            alsoReleased.forEach((l) => store.updateLot(l.id, l));
            for (let i = 0; i <= alsoReleased.length; i++) store.incrementTotalReleased();
            // A leftover ID would be attributed to the NEXT release.
            store.clearWithdrawerId();
            store.clearLotToBeReleased();
            store.resetAll();
            store.setScanResult(LOT_UPSTREAM_MODES.RECEIVE_SUCCESS);
            refreshServerState();
        } catch (error) {
            reportFailure(lotId, error, { toasted: true });
        } finally {
            store.setLotLoading(lotId, false);
        }
    };

    const correctBoxInfo = async ({ lot_id, set_key, box_details, no_of_box }) => {
        try {
            await mutateLot(route("lot-upstream.box-override"), {
                cancelPrevious: false,
                method: "POST",
                body: { lot_id, set_key, box_details, no_of_box },
            });
            toast.success("Box info corrected", toastOptions);
            store.bumpMatchRefresh(); // re-run match + recommendation with the correction applied
            refreshServerState();
            return true;
        } catch (error) {
            if (!isAbortError(error)) {
                toast.error(error?.message || "Could not save the correction", toastOptions);
            }
            return false;
        }
    };

    const recheckLot = async (lot) => {
        const lotId = lot?.lot_id?.trim();
        if (!lotId || store.lotMutations[lotId]?.isLoading) return;

        store.setLotLoading(lotId, true);
        try {
            const result = await mutateLot(route("lot-upstream.recheck"), {
                cancelPrevious: false,
                method: "POST",
                body: { lot_id: lotId },
            });
            const updated = !!result?.data?.updated;
            const message = updated
                ? `Box info found for ${lotId}`
                : (result?.data?.message ?? "Still no usable box info in the source");
            (updated ? toast.success : toast.info)(message, toastOptions);
            refreshServerState();
        } catch (error) {
            reportFailure(lotId, error);
        } finally {
            store.setLotLoading(lotId, false);
        }
    };

    const releaseLotWithdrawerPrompt = (lot) => {
        store.clearWithdrawerId();
        store.setLotToBeReleased(lot);
        store.setScanResult(LOT_UPSTREAM_MODES.OPEN_WITHDRAWAL);
    };

    const handleScanParsed = (parsed) => {
        if (isMutateLotLoading) {
            toast.info("woah, hold on...", toastOptions);
            return;
        }

        const type = parsed.type;
        const command = parsed.command;
        const { pendingLotToBeAdded, mode, slots, scanResult } = store;
        // While the withdrawer dialog is open, scans belong to its input, never to the page.
        const withdrawalOpen =
            scanResult?.status === LOT_UPSTREAM_MODES.OPEN_WITHDRAWAL;

        if (type === LOT_UPSTREAM_MODES.TYPE_COMMAND) {
            if (withdrawalOpen) return;

            if (command === LOT_UPSTREAM_MODES.DONE) {
                if (mode === LOT_UPSTREAM_MODES.RECEIVE) {
                    if (store.isEditMode) {
                        return editLot({
                            ...pendingLotToBeAdded,
                            slot_ids: store.slotPendingLot.map((s) => s.id),
                        });
                    }
                    return confirmLot();
                }
                if (!pendingLotToBeAdded?.lot_id) {
                    return fail(
                        "Error: No lot scanned. Please scan a lot and try again.",
                    );
                }
                return releaseLotWithdrawerPrompt(pendingLotToBeAdded);
            }
            if (command === LOT_UPSTREAM_MODES.RECEIVING) {
                store.setMode(LOT_UPSTREAM_MODES.RECEIVE); store.setIsEditMode(false);
                // New session: never inherit a previous lot or its slots.
                store.removePendingLot();
                store.clearSlotPendingLot();
                store.setScanResult(LOT_UPSTREAM_MODES.OPEN);
                setFocusedField("lot_id");
            }
            if (command === LOT_UPSTREAM_MODES.RELEASING) {
                store.setMode(LOT_UPSTREAM_MODES.RELEASE);
                setFocusedField("lot_id");
            }
            return;
        }

        if (type === LOT_UPSTREAM_MODES.TYPE_FIELD_SELECT) {
            if (withdrawalOpen || mode === LOT_UPSTREAM_MODES.RELEASE) return;

            setFocusedField(parsed.field);
            toast.info(
                `Scanning into: ${parsed.field.replace("_", " ")}`,
                toastOptions,
            );
            store.setScanResult(LOT_UPSTREAM_MODES.OPEN);
            return;
        }

        if (type === LOT_UPSTREAM_MODES.TYPE_LOT) {
            if (withdrawalOpen) return;

            const lot = {
                lot_id: parsed.lot_id,
                partname: parsed.partname,
                qty: parsed.qty,
            };

            store.addPendingLot(
                store.isEditMode ? { ...store.pendingLotToBeAdded, ...lot } : lot,
            );
            setFocusedField(null);

            if (mode === LOT_UPSTREAM_MODES.RELEASE) {
                releaseLotWithdrawerPrompt(lot);
                return;
            }

            store.setScanResult(LOT_UPSTREAM_MODES.OPEN);
            flashScanning();
            return;
        }

        if (type === LOT_UPSTREAM_MODES.TYPE_FIELD_VALUE) {
            if (mode === LOT_UPSTREAM_MODES.RELEASE) {
                if (withdrawalOpen) return;
                releaseLotWithdrawerPrompt({ lot_id: parsed.value });
                return;
            }

            const field = focusedFieldRef.current;
            if (!field) {
                // Nothing is selected to receive a bare value. Writing it anywhere could overwrite a
                // good lot id with e.g. a stray slot barcode, so re-arm the first field and stop.
                setFocusedField(LOT_UPSTREAM_MODES.FIELD_ORDER[0]);
                toast.info(
                    "No field selected. Scan again to fill LOT ID.",
                    toastOptions,
                );
                return;
            }

            store.setScanResult(LOT_UPSTREAM_MODES.OPEN);
            store.editPendingLot(field, parsed.value);
            advanceFocus(field);
            flashScanning();
            return;
        }

        if (type === LOT_UPSTREAM_MODES.TYPE_SLOT) {
            if (mode === LOT_UPSTREAM_MODES.RELEASE || withdrawalOpen) return;

            if (!pendingLotToBeAdded?.lot_id) {
                fail("Error: No lot scanned. Please scan a lot and try again.");
                return;
            }

            if (useLotStore.getState().recommendation.joins) {
                toast.error(
                    "Slots are set by the boxes already in the rack",
                );
                return;
            }

            const slot = slots?.[parsed.slotId];
            if (slot && (slot.is_manually_full || !slot.is_active)) {
                fail(`Error: Slot ${slot.label} is full or disabled.`);
            } else if (slot) {
                store.toggleSlotPendingLot(slot);
                store.setScanResult(LOT_UPSTREAM_MODES.SUCCESS);
            } else {
                fail(
                    "Error: Slot not recognised on this rack page. Please scan a slot and try again.",
                );
            }

            setFocusedField(null);
        }
    };

    return {
        advanceFocus,
        focusedField,
        setFocusedField,
        confirmLot,
        releaseLot,
        resetFocus,
        editLot,
        handleScanParsed,
        releaseLotWithdrawerPrompt,
        isMutateLotLoading,
        mutateLotErrorMessage,
        mutateLotErrorData,
        mutateLotCancel,
        correctBoxInfo,
        recheckLot
    };
}