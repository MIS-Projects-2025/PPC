import CancellableActionButton from "@/Components/CancellableActionButton";
import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";
import useBarcodeScanner from "@/Hooks/useBarcodeScanner";
import { useLotActions } from "@/Hooks/useLotActions";
import { useToast } from "@/Hooks/useToast";
import { playNotification } from "@/Service/AudioService";
import { useLotStore } from "@/Store/useLotStore";
import formatLocalTime from "@/Utils/formatLocalTime";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { FaDownload, FaPlus, FaUpload } from "react-icons/fa";
import RackManagement from "./Rack";

const RACK_SELECTION_ID = "lots_upstream_rack_selector_modal";

import Pagination from "@/Components/Pagination";
import SearchInput from "@/Components/SearchInput";
import { parseLotScanInput } from "@/Lib/parseLotScanInput";
import { router } from "@inertiajs/react";

const RECEIVE = LOT_UPSTREAM_MODES.RECEIVE;
const RELEASE = LOT_UPSTREAM_MODES.RELEASE;

function SlotAssign() {
	const { slotPendingLot, removeSlotPendingLot } = useLotStore();

	return (
		<div className="mb-5 py-2">
			<label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1.5">
				Rack slots
			</label>
			<div className="p-2 bg-base-200 border border-base-content/20 rounded-lg min-h-20 max-h-40 overflow-y-auto gap-2 flex flex-wrap">
				{slotPendingLot.length === 0 && (
					<div className="flex gap-2 w-full justify-center items-center opacity-50">
						None assigned
					</div>
				)}
				{slotPendingLot.map((s, i) => (
					<div key={i} className="flex gap-2">
						{s && (
							<button
								type="button"
								onClick={() => removeSlotPendingLot(s.id)}
								className="btn w-30 btn-ghost group relative flex items-center gap-2 overflow-hidden px-4 py-2 hover:border hover:border-rose-500 hover:text-rose-500"
							>
								<span>{s?.label}</span>
								<span className="scale-0 opacity-0 transition-all duration-100 group-hover:max-w-[50px] group-hover:scale-100 group-hover:text-rose-500 group-hover:opacity-100">
									remove
								</span>
							</button>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

function ScanPanel({ lotActions }) {
	const {
		pendingLotToBeAdded,
		isScanning,
		addPendingLot,
		editPendingLotWithRawInput,
		slotPendingLot,
		lotMutations,
		mode,
	} = useLotStore();
	const {
		focusedField,
		setFocusedField,
		editLot,
		confirmLot,
		isMutateLotLoading,
		mutateLotCancel,
	} = lotActions;
	const inputRefs = useRef({});
	const canConfirm = pendingLotToBeAdded?.lot_id?.trim();

	const handleConfirm = async () => {
		if (!pendingLotToBeAdded?.lot_id?.trim()) {
			return;
		}

		if (mode === LOT_UPSTREAM_MODES.EDIT) {
			console.log("🚀 ~ handleConfirm ~ slotPendingLot:", slotPendingLot);
			editLot({
				...pendingLotToBeAdded,
				qty: parseInt(pendingLotToBeAdded.qty) || 0,
				slot_ids: slotPendingLot.map((s) => s.id),
			});
		} else {
			addPendingLot({
				...pendingLotToBeAdded,
				qty: parseInt(pendingLotToBeAdded.qty) || 0,
				slot_ids: slotPendingLot.map((s) => s.id),
			});
			await confirmLot();
		}
	};

	useEffect(() => {
		if (focusedField && inputRefs.current[focusedField]) {
			// 1. Move focus to the specific field
			inputRefs.current[focusedField].focus();
		} else if (focusedField === null) {
			// 2. If we explicitly set focusedField to null,
			// remove focus from whatever is currently active.
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
		}
	}, [focusedField]);

	const isEdit = mode === LOT_UPSTREAM_MODES.EDIT;

	return (
		<div className="w-full flex flex-col h-full">
			<div className="flex justify-between items-center mb-4">
				<div>
					<h2 className="text-[13px] font-bold tracking-wide">
						{isEdit ? `Edit lot: ${pendingLotToBeAdded?.lot_id}` : "Scan lot"}
						{pendingLotToBeAdded?.status && (
							<span
								className={clsx("badge", {
									"badge-warning": pendingLotToBeAdded?.status === "staged",
									"badge-success": pendingLotToBeAdded?.status === "released",
								})}
							>
								{pendingLotToBeAdded?.status}
							</span>
						)}
					</h2>
					{!isEdit && (
						<p className="text-[11px] text-base-content mt-0.5">
							Scan QR or fill fields manually
						</p>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2 mb-4">
				<div className="flex-1 h-px bg-base-200" />
				<div className="flex-1 h-px bg-base-200" />
			</div>

			{LOT_UPSTREAM_MODES.FIELD_ORDER.map((field) => (
				<div key={field}>
					<label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1">
						{field.replace("_", " ")}
						{focusedField === field && (
							<span className="ml-2 text-primary normal-case tracking-normal font-normal">
								← scanning here
							</span>
						)}
					</label>
					<input
						ref={(el) => (inputRefs.current[field] = el)}
						value={pendingLotToBeAdded[field] || ""}
						className={clsx(
							"input",
							isScanning && focusedField === field ? "animate-pulse" : "",
							focusedField === field ? "input-primary" : "",
						)}
						onChange={(e) => editPendingLotWithRawInput(field, e.target.value)}
						// Physical click as manual override — same as scanning FIELD:*
						onFocus={(e) => {
							setFocusedField(field);
							e.target.select();
						}}
					/>
				</div>
			))}
			{/* <div>
				<label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1">
					Lot ID
				</label>

				<input
					value={pendingLotToBeAdded.lot_id || ""}
					className={clsx("input", isScanning ? "animate-pulse" : "")}
					onChange={(e) => {
						editPendingLot("lot_id", e.target.value);
					}}
				/>
			</div>
			<div>
				<label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1">
					Partname
				</label>

				<input
					value={pendingLotToBeAdded.partname || ""}
					className={clsx("input", isScanning ? "animate-pulse" : "")}
					onChange={(e) => {
						editPendingLot("partname", e.target.value);
					}}
				/>
			</div>
			<div>
				<label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1">
					Qty
				</label>

				<input
					value={pendingLotToBeAdded.qty || ""}
					className={clsx("input", isScanning ? "animate-pulse" : "")}
					onChange={(e) => {
						editPendingLot("qty", e.target.value);
					}}
				/>
			</div> */}
			<SlotAssign />

			<CancellableActionButton
				abort={mutateLotCancel}
				refetch={handleConfirm}
				disabled={!canConfirm}
				loading={lotMutations[pendingLotToBeAdded?.lot_id]?.isLoading}
				buttonText={isEdit ? "Save changes" : "Confirm receive"}
				loadingMessage={isEdit ? "Saving..." : "Receiving..."}
			/>
		</div>
	);
}

function ReceivedList({ slots, onEdit, lotActions }) {
	const { lots, lastAddedId, recentUpdates, lotMutations } = useLotStore();
	const { mutateLotCancel, isMutateLotLoading, releaseLot } = lotActions;
	const [releaseConfirm, setReleaseConfirm] = useState(null);

	return (
		<div className="bg-base-100 h-[calc(100vh-230px)] border shadow-md border-base-300 rounded-xl overflow-hidden flex flex-col">
			<div
				className="overflow-y-auto mt-2"
				style={{ maxHeight: "calc(100vh - 260px)" }}
			>
				{lots.length === 0 ? (
					<div className="py-12 text-center text-[12px] text-base-content">
						No lots found
					</div>
				) : (
					lots.map((lot, idx) => {
						const recentUpdate = recentUpdates[lot.id];
						const isReleasingThisLot = releaseConfirm === lot.id;
						return (
							<div
								key={lot.id}
								className={clsx(
									"group relative flex items-start justify-between px-4 py-1 gap-3 border-b border-base-300 last:border-none hover:bg-base-200 transition-colors",
									recentUpdate && "animate-updated",
									idx % 2 === 0 && "bg-base-200/50",
									lot.id === lastAddedId && "animate-new-item",
								)}
							>
								<div className="flex items-start gap-3 min-w-0">
									<span className="text-[10px] font-bold text-base-content w-5 pt-0.5 flex-shrink-0">
										{lots.length - idx}
									</span>
									<div className="min-w-0">
										<div className="flex items-center gap-2">
											<p className="text-[13px] antialiased font-jet-brains font-bold truncate">
												{lot.lot_id}
											</p>
											<p className="text-[11px] antialiased font-jet-brains text-base-content truncate">
												{lot.partname}
											</p>
											{recentUpdate && (
												<div className="flex items-center gap-0 ml-1">
													{/* arrow */}
													<div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-base-300" />
													<div className="bg-base-300 text-base-content text-[11px] px-2 py-0.5 rounded-sm whitespace-nowrap">
														{recentUpdate?.user || "System"}{" "}
														{recentUpdate?.action || "did something on"} this
													</div>
												</div>
											)}
										</div>
										<div className="flex gap-1.5 flex-wrap mt-1.5 items-center">
											<span className="text-[10px] font-semibold rounded bg-base-200 text-base-content border border-base-300">
												{lot.qty} units
											</span>
											{Object.entries(lot.positions_map).map(([slotId]) => (
												<div
													key={slotId}
													className="text-[10px] pl-1 flex items-center gap-1 font-bold rounded bg-base-100 text-orange-700 border border-orange-500/30 tracking-wide"
												>
													{slots[slotId]?.rack?.label}
													<div className="opacity-50">|</div>
													{slots[slotId]?.label}
													<div>
														{" "}
														({slots[slotId]?.rack?.production_line?.name})
													</div>
												</div>
											))}
										</div>
									</div>
								</div>

								<div className="flex flex-col items-end gap-2 shrink-0">
									<div className="flex flex-col items-end gap-1">
										<div
											className={clsx(
												"badge badge-xs",
												lot.released_at ? "badge-success" : "badge-warning",
											)}
										>
											{lot.released_at ? "released" : "staged"}
										</div>
										<span className="text-[10px] text-base-content font-mono">
											{formatLocalTime(lot.released_at ?? lot.received_at)} by{" "}
											{lot.released_at
												? lot?.released_by?.FIRSTNAME
												: lot?.received_by?.FIRSTNAME}
										</span>
									</div>
									{isReleasingThisLot ? (
										<div className="absolute p-4 backdrop-blur-xs top-1/2 -translate-y-1/2 right-0 flex items-center gap-2">
											<span>confirm release?</span>
											<button
												type="button"
												className="btn btn-sm btn-ghost text-error"
												onClick={() => setReleaseConfirm(null)}
											>
												cancel
											</button>
											<CancellableActionButton
												abort={() => mutateLotCancel(lot.lot_id)}
												refetch={() => {
													releaseLot(lot);
													setReleaseConfirm(null);
												}}
												loading={lotMutations[lot.lot_id]?.isLoading}
												buttonText="Confirm Release"
												loadingMessage="Releasing..."
											/>
										</div>
									) : (
										<div className="absolute p-4 backdrop-blur-xs top-1/2 -translate-y-1/2 right-0 hidden group-hover:flex gap-2">
											<button
												type="button"
												onClick={() => onEdit(lot)}
												className="btn btn-sm btn-secondary"
											>
												Edit
											</button>
											{!lot.released_at && (
												<button
													type="button"
													onClick={() => setReleaseConfirm(lot.id)}
													className="btn btn-sm btn-primary"
												>
													Release
												</button>
											)}
										</div>
									)}
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}

export default function LotsUpstream({
	lots: received,
	totalEntries,
	slots,
	racks,
	filters: serverFilters,
	productionLine,
}) {
	console.log("🚀 ~ LotsUpstream ~ racks:", racks);
	console.log("🚀 ~ LotsUpstream ~ received:", received);
	const toast = useToast();
	const lotActions = useLotActions();
	const {
		initialize,
		isScanning,
		addPendingLot,
		updateLot,
		mode,
		setMode,
		setEditingLot,
		setSlots,
		toggleSlotPendingLot,
		scanResult,
		receiveLot,
		appendRecentUpdate,
		clearSlotPendingLot,
		clearRecentUpdate,
		slotPendingLot,
	} = useLotStore();

	// TODO: lot is missing on pl6

	const [filters, setFilters] = useState({
		search: serverFilters.search ?? "",
		status: serverFilters.status ?? "",
		received_date_from: serverFilters.received_date_from ?? "",
		received_date_to: serverFilters.received_date_to ?? "",
		released_date_from: serverFilters.released_date_from ?? "",
		released_date_to: serverFilters.released_date_to ?? "",
		aging: serverFilters.aging ?? false,
		unslotted: serverFilters.unslotted ?? false,
	});

	const set = (key, val) => setFilters((prev) => ({ ...prev, [key]: val }));

	const apply = () => {
		const params = Object.fromEntries(
			Object.entries(filters).filter(([, v]) => v !== "" && v !== false),
		);
		router.get(
			route("lot-upstream.index", { productionLine: productionLine }),
			params,
			{
				preserveState: true,
				preserveScroll: true,
			},
		);
	};

	const resetFilters = () => {
		setFilters({
			search: "",
			status: "",
			received_date_from: "",
			received_date_to: "",
			released_date_from: "",
			released_date_to: "",
			aging: false,
			unslotted: false,
		});
	};

	useEffect(() => {
		initialize(received.data);
		setSlots(slots);
	}, [received, slots]);

	useEffect(() => {
		if (mode === LOT_UPSTREAM_MODES.RECEIVE) {
			playNotification(LOT_UPSTREAM_MODES.RECEIVE);
		} else if (mode === LOT_UPSTREAM_MODES.RELEASE) {
			playNotification(LOT_UPSTREAM_MODES.RELEASE);
		}
	}, [mode]);

	useEffect(() => {
		console.log("🚀 ~ LotsUpstream ~ scanResult:", scanResult);
		if (!scanResult.status) return;

		if (scanResult.status === LOT_UPSTREAM_MODES.OPEN) {
			document.getElementById(RACK_SELECTION_ID)?.showModal();
			return;
		}

		if (scanResult.status === LOT_UPSTREAM_MODES.CLOSE) {
			document.getElementById(RACK_SELECTION_ID)?.close();
			return;
		}

		if (scanResult.status === LOT_UPSTREAM_MODES.RECEIVE_SUCCESS) {
			playNotification(LOT_UPSTREAM_MODES.SUCCESS);
			document.getElementById(RACK_SELECTION_ID)?.close();
			return;
		}

		if (scanResult.status === LOT_UPSTREAM_MODES.SUCCESS) {
			playNotification(LOT_UPSTREAM_MODES.SUCCESS);
		} else if (scanResult.status === LOT_UPSTREAM_MODES.WRONG) {
			playNotification(LOT_UPSTREAM_MODES.WRONG);
		}
	}, [scanResult]);

	const handleEdit = (lot) => {
		console.log("🚀 ~ handleEdit ~ lot:", lot);
		addPendingLot(lot);
		setMode(LOT_UPSTREAM_MODES.EDIT);
		setEditingLot(lot);

		clearSlotPendingLot();
		lot.slot_ids.forEach((id) => {
			const slot = Object.values(slots).find((s) => s.id === id);
			if (slot) toggleSlotPendingLot(slot);
		});

		document.getElementById(RACK_SELECTION_ID)?.showModal();
	};

	useBarcodeScanner((currentBuffer, e) => {
		const parsed = parseLotScanInput(currentBuffer);
		console.log("🚀 ~ LotsUpstream ~ parsed:", parsed);

		if (
			parsed.type === LOT_UPSTREAM_MODES.TYPE_SLOT ||
			parsed.type === LOT_UPSTREAM_MODES.TYPE_COMMAND
		) {
			e.preventDefault();
			e.stopPropagation();
		}

		lotActions.handleScanParsed(parsed);
	});

	const handleSelectFromRack = useCallback((slot) => {
		toggleSlotPendingLot(slot);
	}, []);

	const selectedSlotIds = useMemo(
		() => new Set(slotPendingLot.map((s) => s.id)),
		[slotPendingLot],
	);

	useEffect(() => {
		const channel = window.Echo.channel("lot-updates");

		channel.listen("LotChanged", (e) => {
			console.log("⚡ Received (Plain):", e);
			const action = e?.action ?? "did something on ";
			const id = e?.id ?? null;
			const data = e?.data ?? null;

			const receivedBy = e?.data?.received_by?.FIRSTNAME ?? "someone";
			const modifiedBy = e?.data?.modified_by?.FIRSTNAME ?? "someone";
			const releasedBy = e?.data?.released_by?.FIRSTNAME ?? "someone";

			let mutator = "someone";
			if (action === "created") {
				mutator = receivedBy;
				receiveLot({
					...e.data,
				});
				appendRecentUpdate(e.id, mutator, action);
				setTimeout(() => clearRecentUpdate(e.id), 5000);
			} else if (action === "updated" || action === "released") {
				mutator = action === "released" ? releasedBy : modifiedBy;
				updateLot(e.id, e.data);
				appendRecentUpdate(e.id, mutator, action);
				setTimeout(() => clearRecentUpdate(e.id), 5000);
			}

			if (!id || !data) return;

			toast.info(`${mutator} ${action} ${data?.lot_id}`, {
				duration: 10000,
				position: "top-center",
			});
		});

		return () => window.Echo.leave("lot-updates");
	}, []);

	const goToPage = (page) => {
		router.reload({
			data: {
				page,
			},
			preserveState: true,
			preserveScroll: true,
		});
	};

	return (
		<div className="bg-base-200 font-mono">
			<Toaster position="top-right" />

			<dialog id={RACK_SELECTION_ID} className="modal z-50">
				<div className="modal-box w-11/12 border border-base-content/50 max-w-[calc(100vw-4rem)] h-[calc(100vh-4.5rem)] overflow-hidden p-0">
					<Toaster position="top-right" />

					<div className="flex w-full h-full">
						<div className="w-8/12">
							<RackManagement
								racks={racks}
								selectedSlotIds={selectedSlotIds}
								initialDetailedView={false}
								multiSelect={true}
								disableSideDetailPanel
								onSlotSelect={handleSelectFromRack}
							/>
						</div>

						<div className="w-0.5 h-full bg-base-content/25"></div>

						<div className="w-4/12 p-4">
							<ScanPanel lotActions={lotActions} />
						</div>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop">
					<button>close</button>
				</form>
			</dialog>

			<div className="flex flex-col gap-4 overflow-hidden rounded-lg p-2">
				<div className="flex items-center gap-2">
					<div
						className={clsx("text-7xl font-extrabold text-shadow-lg", {
							"text-error": mode === RELEASE,
							"text-secondary": mode === RECEIVE,
						})}
					>
						{productionLine}
					</div>
					<fieldset
						className={clsx(
							"fieldset bg-base-100 border-base-300 shadow-lg rounded-box w-64 border px-4 py-2",
							{
								"border-error shadow-error": mode === RELEASE,
								"border-secondary shadow-secondary": mode === RECEIVE,
							},
						)}
					>
						<legend className="fieldset-legend leading-0 mb-1 text-xl">
							Scanner Mode
						</legend>
						<label className="label">
							<input
								type="checkbox"
								checked={mode === RELEASE}
								className={clsx("toggle", {
									"toggle-error": mode === RELEASE,
									"toggle-secondary": mode === RECEIVE,
								})}
								onChange={() => setMode(mode === RELEASE ? RECEIVE : RELEASE)}
							/>
							<div
								className={clsx(
									"flex w-full items-center justify-between gap-2 text-xl font-extrabold letter-spacing-2",
									{
										"text-error": mode === RELEASE,
										"text-secondary": mode === RECEIVE,
									},
								)}
							>
								<span className="tracking-[.2em]">
									{mode === RELEASE ? "RELEASING" : "RECEIVING"}
								</span>
								<span>
									{mode === RELEASE ? (
										<FaUpload className="w-5 h-5" />
									) : (
										<FaDownload className="w-5 h-5" />
									)}
								</span>
							</div>
						</label>
					</fieldset>

					<div className="flex-1 border-base-300 flex flex-wrap gap-2 items-center">
						<div className="flex flex-col gap-2">
							<button
								type="button"
								className={clsx(
									"btn btn-primary border-2 h-full",
									isScanning
										? "border-success shadow-success"
										: "border-transparent",
								)}
								onClick={() => {
									document.getElementById(RACK_SELECTION_ID)?.showModal();
								}}
							>
								Add Lot <FaPlus />
							</button>
							<SearchInput
								initialSearchInput={filters.search}
								onSearchChange={(searchInput) => set("search", searchInput)}
								inputClassName="w-30 ml-0"
							/>
						</div>

						<fieldset
							className={clsx(
								"fieldset border-base-300 rounded-box w-28 border p-0",
							)}
						>
							<legend className="fieldset-legend font-light leading-0 text-xs">
								Released Date
							</legend>
							<label className="flex flex-col label">
								<div className="flex items-center">
									<div className="w-8 text-right">from</div>
									<input
										type="date"
										value={filters.released_date_from}
										onChange={(e) => set("released_date_from", e.target.value)}
										className="input input-sm text-[12px] bg-transparent rounded-md"
									/>
								</div>
								<div className="flex items-center">
									<div className="w-8 text-right">to</div>
									<input
										type="date"
										value={filters.released_date_to}
										onChange={(e) => set("released_date_to", e.target.value)}
										className="input input-sm text-[12px] bg-transparent rounded-md"
									/>
								</div>
							</label>
						</fieldset>

						<fieldset
							className={clsx(
								"fieldset border-base-300 rounded-box w-28 border p-0",
							)}
						>
							<legend className="fieldset-legend font-light leading-0 text-xs">
								Received Date
							</legend>
							<label className="flex flex-col label">
								<div className="flex items-center">
									<div className="w-8 text-right">from</div>
									<input
										type="date"
										value={filters.received_date_from}
										onChange={(e) => set("received_date_from", e.target.value)}
										className="input input-sm text-[12px] bg-transparent rounded-md"
									/>
								</div>
								<div className="flex items-center">
									<div className="w-8 text-right">to</div>
									<input
										type="date"
										value={filters.received_date_to}
										onChange={(e) => set("received_date_to", e.target.value)}
										className="input input-sm text-[12px] bg-transparent rounded-md"
									/>
								</div>
							</label>
						</fieldset>

						<div className="flex flex-col gap-1">
							<button
								type="button"
								className="btn btn-sm"
								popoverTarget="status-select"
								style={{
									anchorName: "--anchor-status-select",
								}}
							>
								{filters.status || "All Status"}
							</button>

							<ul
								className="dropdown menu w-52 rounded-box bg-base-100 shadow-sm"
								popover="auto"
								id="status-select"
								style={{
									positionAnchor: "--anchor-status-select",
								}}
							>
								<li onClick={() => set("status", "staged")}>
									<a>Staged</a>
								</li>
								<li onClick={() => set("status", "released")}>
									<a>Released</a>
								</li>
							</ul>

							<label className="flex items-center gap-1.5 cursor-pointer select-none">
								<input
									type="checkbox"
									className="checkbox checked:checkbox-primary checkbox-xs"
									checked={filters.aging}
									onChange={(e) => set("aging", e.target.checked)}
								/>
								<span className="text-[12px]">Aging ≥3d</span>
							</label>

							<label className="flex items-center gap-1.5 cursor-pointer select-none">
								<input
									type="checkbox"
									className="checkbox checked:checkbox-primary checkbox-xs"
									checked={filters.unslotted}
									onChange={(e) => set("unslotted", e.target.checked)}
								/>
								<span className="text-[12px]">Unslotted</span>
							</label>
						</div>

						<div className="flex flex-col gap-1 items-end ml-auto">
							<button
								type="button"
								onClick={apply}
								className="btn btn-xs btn-primary text-[12px]"
							>
								Apply filters
							</button>
							<button
								type="button"
								onClick={resetFilters}
								className="btn btn-xs btn-ghost text-[12px]"
							>
								reset filters
							</button>
						</div>
					</div>
				</div>

				<div className="flex-1 min-w-0 overflow-y-auto">
					<Pagination
						links={received.links}
						currentPage={received?.current_page}
						goToPage={goToPage}
						filteredTotal={received?.total}
						overallTotal={totalEntries}
						start={received?.from}
						end={received?.to}
						contentClassName={"m-0 p-0"}
					/>
					<ReceivedList
						slots={slots}
						onEdit={handleEdit}
						lotActions={lotActions}
					/>
				</div>
			</div>
		</div>
	);
}
