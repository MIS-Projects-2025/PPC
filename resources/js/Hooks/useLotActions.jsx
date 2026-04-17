import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";
import { useToast } from "@/Hooks/useToast";
import { useLotStore } from "@/Store/useLotStore";
import { useState } from "react";
import { useMutation } from "./useMutation";

const toastOptions = {
	// duration: 5000,
	position: "top-center",
	className: "text-[34px] font-bold w-[700px] p-6 leading-10",
};

export function useLotActions() {
	const store = useLotStore();
	const toast = useToast();
	const [focusedField, setFocusedField] = useState(
		LOT_UPSTREAM_MODES.FIELD_ORDER[0],
	);

	const {
		mutate: mutateLot,
		isLoading: isMutateLotLoading,
		errorMessage: mutateLotErrorMessage,
		errorData: mutateLotErrorData,
		cancel: mutateLotCancel,
	} = useMutation();

	const advanceFocus = (currentField) => {
		const next =
			LOT_UPSTREAM_MODES.FIELD_ORDER[
				LOT_UPSTREAM_MODES.FIELD_ORDER.indexOf(currentField) + 1
			];
		setFocusedField(next ?? LOT_UPSTREAM_MODES.FIELD_ORDER[0]);
	};

	const confirmLot = async () => {
		const socketId = window.Echo?.socketId();
		const { pendingLotToBeAdded, slotPendingLot } = store;

		if (!pendingLotToBeAdded?.lot_id) {
			toast.error(
				`Error: No lot scanned. Please scan a lot and try again.`,
				toastOptions,
			);
			store.setScanResult(LOT_UPSTREAM_MODES.WRONG);
			return;
		}

		if (store.lotMutations[pendingLotToBeAdded.lot_id]?.isLoading) {
			return;
		}

		store.setLotLoading(pendingLotToBeAdded.lot_id, true);
		// if (slotPendingLot.length === 0) {
		// 	toast.error(
		// 		`Error: No rack slots selected. Please select at least one rack slot and try again.`,
		// 		toastOptions,
		// 	);
		// 	store.setScanResult(LOT_UPSTREAM_MODES.WRONG);
		// 	return;
		// }

		try {
			const result = await mutateLot(route("lot-upstream.store"), {
				cancelPrevious: true,
				method: "POST",
				body: {
					...pendingLotToBeAdded,
					slot_ids: slotPendingLot.map((s) => s.id),
				},
				additionalHeaders: {
					...(socketId && { "X-Socket-ID": socketId }),
				},
			});

			toast.success(
				`Added ${pendingLotToBeAdded.lot_id} → ${slotPendingLot.map((s) => s.label || s.name).join(", ")}`,
				toastOptions,
			);

			store.receiveLot(result?.data ?? {});
			store.resetAll();
			store.setScanResult(LOT_UPSTREAM_MODES.RECEIVE_SUCCESS);
		} catch (error) {
			store.setLotError(pendingLotToBeAdded.lot_id, error);
			toast.error(error?.message || "Something went wrong", toastOptions);
			store.setScanResult(LOT_UPSTREAM_MODES.WRONG);
		} finally {
			store.setLotLoading(pendingLotToBeAdded.lot_id, false);
		}
	};

	const editLot = async (updatedData) => {
		const socketId = window.Echo?.socketId();
		try {
			store.setLotLoading(updatedData.lot_id, true);

			if (store.lotMutations[updatedData.lot_id]?.isLoading) {
				return;
			}

			const result = await mutateLot(
				route("lot-upstream.update", encodeURIComponent(updatedData.id)),
				{
					cancelPrevious: true,
					method: "PATCH",
					body: updatedData,
					additionalHeaders: {
						...(socketId && { "X-Socket-ID": socketId }),
					},
				},
			);

			toast.success(`You edited ${result.data?.lot_id}`, toastOptions);

			store.updateLot(result.data.id, result.data);
			store.resetAll();
		} catch (error) {
			store.setLotError(updatedData.lot_id, error);
			toast.error(error?.message || "Something went wrong", toastOptions);
			console.error(error);
		} finally {
			store.setLotLoading(updatedData.lot_id, false);
			store.setScanResult(LOT_UPSTREAM_MODES.CLOSE);
		}
	};

	const releaseLot = async (lot) => {
		const socketId = window.Echo?.socketId();
		const lotId = lot.lot_id;

		if (store.lotMutations[lotId]?.isLoading) {
			return;
		}

		// TODO: 2 rapid consequtive released will not update the first lot relased on store

		if (!lotId) {
			toast.error(
				`Error: No lot scanned. Please scan a lot and try again.`,
				toastOptions,
			);
			store.setScanResult(LOT_UPSTREAM_MODES.WRONG);
			return;
		}

		store.setLotLoading(lotId, true);
		const promise = mutateLot(route("lot-upstream.release"), {
			cancelPrevious: true,
			mutationKey: lotId,
			method: "POST",
			body: { lot_id: lotId, partname: lot.partname },
			additionalHeaders: {
				...(socketId && { "X-Socket-ID": socketId }),
			},
		});

		toast.promise(
			promise,
			{
				loading: "Releasing...",
				success: `Released ${lotId}`,
				error: (err) => err?.message || "Something went wrong",
			},
			toastOptions,
		);

		try {
			const result = await promise;
			console.log("[release] result for", lotId, result?.data);
			store.updateLot(result?.data?.id, result?.data);
			console.log(
				"[release] lots after update:",
				useLotStore
					.getState()
					.lots.map((l) => ({ id: l.id, status: l.status })),
			);
			store.resetAll();
			store.setScanResult(LOT_UPSTREAM_MODES.SUCCESS);
		} catch (error) {
			store.setLotError(lotId, error?.message);
			store.setScanResult(LOT_UPSTREAM_MODES.WRONG);
		} finally {
			store.setLotLoading(lotId, false);
		}
	};

	const handleScanParsed = (parsed) => {
		if (isMutateLotLoading) {
			toast.info("woah, hold on...", toastOptions);
			return;
		}
		const type = parsed.type;
		const command = parsed.command;
		const { pendingLotToBeAdded, mode, slots } = store;

		console.log("🚀 ~ handleScanParsed ~ parsed:", parsed);

		if (type === LOT_UPSTREAM_MODES.TYPE_COMMAND) {
			if (command === LOT_UPSTREAM_MODES.DONE) {
				return mode === LOT_UPSTREAM_MODES.RECEIVE
					? confirmLot()
					: releaseLot(pendingLotToBeAdded);
			}
			if (command === LOT_UPSTREAM_MODES.RECEIVING) {
				store.setMode(LOT_UPSTREAM_MODES.RECEIVE);
				store.setScanResult(LOT_UPSTREAM_MODES.OPEN);
				setFocusedField("lot_id");
			}
			if (command === LOT_UPSTREAM_MODES.RELEASING) {
				store.setMode(LOT_UPSTREAM_MODES.RELEASE);
				// setFocusedField(null);
				setFocusedField("lot_id");
			}
			return;
		}

		if (type === LOT_UPSTREAM_MODES.TYPE_FIELD_SELECT) {
			// Option B: explicit field targeting — repositions cursor, no value written
			setFocusedField(parsed.field);
			toast.info(
				`Scanning into: ${parsed.field.replace("_", " ")}`,
				toastOptions,
			);
			store.setScanResult(LOT_UPSTREAM_MODES.OPEN);
			return;
		}

		if (type === LOT_UPSTREAM_MODES.TYPE_LOT) {
			const lot = {
				lot_id: parsed.lot_id,
				partname: parsed.partname,
				qty: parsed.qty,
			};

			store.addPendingLot(lot);
			setFocusedField(null);

			if (mode === LOT_UPSTREAM_MODES.RELEASE) {
				releaseLot(lot);
			}

			if (mode === LOT_UPSTREAM_MODES.RECEIVE) {
				store.setScanResult(LOT_UPSTREAM_MODES.OPEN);
			}

			store.setIsScanning(true);
			setTimeout(() => store.setIsScanning(false), 200);
		}

		if (type === LOT_UPSTREAM_MODES.TYPE_FIELD_VALUE) {
			if (!focusedField) {
				toast.error(
					"No field targeted. Scan a FIELD: barcode or re-scan RECEIVING.",
					toastOptions,
				);

				store.setScanResult(LOT_UPSTREAM_MODES.WRONG);
				return;
			}

			store.setScanResult(LOT_UPSTREAM_MODES.OPEN);

			store.editPendingLot(focusedField, parsed.value);

			advanceFocus(focusedField);

			store.setIsScanning(true);
			setTimeout(() => store.setIsScanning(false), 200);
			return;
		}

		if (type === LOT_UPSTREAM_MODES.TYPE_SLOT) {
			if (Object.keys(pendingLotToBeAdded).length === 0) {
				toast.error(
					`Error: No lot scanned. Please scan a lot and try again.`,
					toastOptions,
				);
				store.setScanResult(LOT_UPSTREAM_MODES.WRONG);
				return;
			}

			const slot = slots[parsed.slotId];
			if (slot) {
				store.toggleSlotPendingLot(slot);
				store.setScanResult(LOT_UPSTREAM_MODES.SUCCESS);
			} else {
				toast.error(
					`Error: No slot scanned. Please scan a slot and try again.`,
					toastOptions,
				);
				store.setScanResult(LOT_UPSTREAM_MODES.WRONG);
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
		editLot,
		handleScanParsed,
		isMutateLotLoading,
		mutateLotErrorMessage,
		mutateLotErrorData,
		mutateLotCancel,
	};
}
