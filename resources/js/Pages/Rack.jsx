import RackTopView from "@/Components/RackTopView";
import { useToast } from "@/Hooks/useToast";
import { router } from "@inertiajs/react";
import clsx from "clsx";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { PiArrowFatDownFill } from "react-icons/pi";
import { Tooltip } from "react-tooltip";
import { create } from "zustand";

const useInternalStore = create((set) => ({
	racks: [], // Add racks to store
	selectedSlot: null,
	isDetailedView: true,
	slotsMap: {},
	viewMode: "top",
	setViewMode: (viewMode) => set({ viewMode }),
	initializeRacks: (racks) => set({ racks }),
	updateSlot: (slotId, payload) =>
		set((state) => ({
			racks: state.racks.map((rack) => ({
				...rack,
				shelves: Object.fromEntries(
					Object.entries(rack.shelves ?? {}).map(([label, slots]) => [
						label,
						slots.map((s) => (s.id === slotId ? { ...s, ...payload } : s)),
					]),
				),
			})),
			// Keep the selected slot's snapshot in sync (it is a copy, not a reference).
			selectedSlot:
				state.selectedSlot?.id === slotId
					? { ...state.selectedSlot, ...payload }
					: state.selectedSlot,
		})),
	setSelectedSlot: (slot) => set({ selectedSlot: slot }),
	clearSelectedSlot: () => set({ selectedSlot: null }),
	setIsDetailedView: (val) => set({ isDetailedView: val }),
	toggleIsDetailedView: () =>
		set((state) => ({ isDetailedView: !state.isDetailedView })),
}));

const NO_RECOMMENDATION = [];
const NO_SELECTION = new Set();
const NO_LOTS = [];

export default function RackManagement({
	racks,
	occupancy,
	onSlotSelect,
	initialDetailedView = true,
	disableSideDetailPanel = false,
	multiSelect = false,
	selectedSlotIds = NO_SELECTION,
	recommendedSlotIds = NO_RECOMMENDATION,
	initialView = "top",
	floorMap,
	floorMaps,
}) {
	const [primedVisible, setPrimedVisible] = useState(false);
	const isDetailedView = useInternalStore((state) => state.isDetailedView);
	const initializeRacks = useInternalStore((state) => state.initializeRacks);
	const storeRacks = useInternalStore((state) => state.racks);

	const viewMode = useInternalStore((s) => s.viewMode);
	const setViewMode = useInternalStore((s) => s.setViewMode);
	const storeSelectedSlot = useInternalStore((s) => s.selectedSlot);

	// Not memoized on purpose: if the parent mutates the Set in place, a memo keyed on
	// the unchanged reference would keep showing stale selection state.
	const pickedIds =
		selectedSlotIds instanceof Set ? selectedSlotIds : new Set(selectedSlotIds ?? []);

	// The slot that counts as "active" (ring, arrow, lot highlight, side panel).
	// In multi-select mode it only counts while it is still ticked; the store keeps the last
	// clicked slot, which used to stay highlighted after the slot was un-clicked.
	const activeSlot =
		multiSelect && storeSelectedSlot && !pickedIds.has(storeSelectedSlot.id)
			? null
			: storeSelectedSlot;

	// Also clean the store itself. Runs after every render (cheap) so it works even when the
	// parent mutates the Set in place.
	useEffect(() => {
		if (multiSelect && storeSelectedSlot && !pickedIds.has(storeSelectedSlot.id)) {
			useInternalStore.getState().clearSelectedSlot();
		}
	});

	useEffect(() => {
		useInternalStore.getState().setViewMode(initialView);
	}, []);

	// Refs keep handleSlotPick stable, so the memoized SlotButtons don't re-render on every parent render.
	const onSlotSelectRef = useRef(onSlotSelect);
	onSlotSelectRef.current = onSlotSelect;
	const multiSelectRef = useRef(multiSelect);
	multiSelectRef.current = multiSelect;

	// One click path for the grid and the top view.
	const handleSlotPick = useCallback((slot) => {
		const { selectedSlot, setSelectedSlot, clearSelectedSlot } = useInternalStore.getState();
		if (!multiSelectRef.current && selectedSlot?.id === slot.id) {
			clearSelectedSlot(); // clicking the active slot again un-clicks it
		} else {
			setSelectedSlot(slot);
		}
		onSlotSelectRef.current?.(slot);
	}, []);

	const recommendedRanks = useMemo(
		() => new Map(recommendedSlotIds.map((id, i) => [id, i + 1])),
		[recommendedSlotIds],
	);

	useEffect(() => {
		initializeRacks(racks ?? []);
	}, [racks, initializeRacks]);

	useEffect(() => {
		const id = (window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1)))(() => setPrimedVisible(true), {
			timeout: 2000,
		});
		return () => (window.cancelIdleCallback ?? clearTimeout)(id);
	}, []);

	useEffect(() => {
		useInternalStore.getState().setIsDetailedView(initialDetailedView);
	}, []);

	const handleChangeDetailView = () => {
		useInternalStore.getState().toggleIsDetailedView();
	};

	return (
		<div className="flex w-full h-full text-base-content overflow-hidden font-sans">
			<main className="flex-1 w-full overflow-y-auto p-4">
				<div className="flex items-center justify-between">
					<header className="mb-2">
						<h1 className="text-xl font-black tracking-tight text-base-content uppercase">
							Lot Inventory
						</h1>
					</header>

					<div className="flex items-center gap-2">
						<div className="join mb-2">
							<button type="button" onClick={() => setViewMode("grid")}
								className={clsx("btn btn-sm join-item", viewMode === "grid" && "btn-secondary")}>Grid</button>
							<button type="button" onClick={() => setViewMode("top")}
								className={clsx("btn btn-sm join-item", viewMode === "top" && "btn-secondary")}>Top view</button>
						</div>

						{viewMode === "grid" && <div className="flex gap-1 mb-2">
							<div>compact</div>
							<input
								type="checkbox"
								checked={!isDetailedView}
								className="toggle toggle-secondary"
								onChange={handleChangeDetailView}
							/>
						</div>}
					</div>
				</div>

				{viewMode === "grid" ? (
					<div className="grid w-full gap-4">
						{storeRacks.map((rack) => (
							<RackGrid
								key={rack.id}
								rack={rack}
								occupancy={occupancy}
								activeSlot={activeSlot}
								onPick={handleSlotPick}
								multiSelect={multiSelect}
								selectedSlotIds={pickedIds}
								forceVisible={primedVisible}
								recommendedRanks={recommendedRanks}
							/>
						))}
					</div>
				) : (
					<RackTopView
						racks={storeRacks}
						occupancy={occupancy}
						selectedSlot={activeSlot}
						selectedSlotIds={pickedIds}
						multiSelect={multiSelect}
						recommendedRanks={recommendedRanks}
						onSlotPick={handleSlotPick}
						floorMap={floorMap}
						floorMaps={floorMaps}
					/>
				)}
			</main>

			{disableSideDetailPanel || <SlotDetailPanel slot={activeSlot} occupancy={occupancy} />}
		</div>
	);
}

function RackGrid({
	rack,
	occupancy,
	activeSlot,
	onPick,
	multiSelect,
	selectedSlotIds,
	forceVisible,
	recommendedRanks,
}) {
	const ref = useRef(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (forceVisible) {
			setVisible(true);
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) setVisible(true);
			},
			{ threshold: 0.01 },
		);
		if (ref.current) observer.observe(ref.current);
		return () => observer.disconnect();
	}, [forceVisible]);

	const highlightedSlotIds = useMemo(() => {
		if (!activeSlot) return new Set();
		const lots = occupancy?.[String(activeSlot.id)] ?? NO_LOTS;
		return new Set(lots.flatMap((l) => l.slot_ids ?? []));
	}, [activeSlot, occupancy]);

	const shelves = rack.shelves ?? {};
	const entries = Object.entries(shelves);
	const slotCount = Math.max(0, ...entries.map(([, slots]) => slots.length));

	return (
		<section
			style={{
				// contentVisibility: 'auto',
				containIntrinsicSize: "0 300px",
			}}
			ref={ref}
			className="bg-base-100 rounded-lg border border-base-300 relative w-full shadow-xs"
		>
			<h2 className="text-xl w-full font-bold mb-2 flex items-center sticky -top-4 bg-base-100 z-10 p-2 rounded-t-lg shadow-sm">
				{rack.label}
				{entries.length === 0 && (
					<span className="ml-2 text-sm font-light text-base-content/70">
						empty rack
					</span>
				)}
			</h2>
			<div className="space-y-4 pb-2">
				{Array.from({ length: slotCount }, (_, i) => (
					<div key={i} className="flex">
						{entries.map(([rowLabel, rowSlots]) => {
							const slot = rowSlots[i];
							if (!slot) return <div key={rowLabel} className="min-w-15 min-h-12" />;
							return (
								<SlotButton
									key={slot.id}
									slot={slot}
									lots={occupancy?.[slot.id] ?? NO_LOTS}
									isActive={activeSlot?.id === slot.id}
									isHighlighted={highlightedSlotIds.has(slot.id)}
									isSelected={selectedSlotIds.has(slot.id)}
									multiSelect={multiSelect}
									onPick={onPick}
									recommendedRank={recommendedRanks?.get(slot.id)}
									recommendedTotal={recommendedRanks?.size ?? 0}
								/>
							);
						})}
					</div>
				))}
			</div>
		</section>
	);
}

const SlotButton = React.memo(function SlotButton({
	slot,
	lots,
	isActive,
	isHighlighted,
	multiSelect,
	onPick,
	isSelected,
	recommendedRank,
	recommendedTotal,
}) {
	const isDetailedView = useInternalStore((state) => state.isDetailedView);
	const updateSlot = useInternalStore((state) => state.updateSlot);
	const [hovered, setHovered] = useState(false);
	const toast = useToast();
	const hasLots = lots.length > 0;
	const slotLabel = slot?.label || slot?.meta?.label;
	const isMultiLot = lots.length > 1;
	const isLargeLot = lots.some((l) => l.slot_ids?.length > 1);
	const hasExceededAgeThreshold = lots.some(
		(l) => l.has_exceeded_age_threshold,
	);
	const isManuallyFull = slot?.is_manually_full;

	const isSlotEnabled = slot?.is_active;

	const handleMarkSlotFullToggle = async () => {
		const updateType = isManuallyFull ? "clearFull" : "markFull";
		const url = route(`rack.rack-slot.${updateType}`, { id: slot.id });
		const nextValue = !isManuallyFull;

		try {
			const response = await fetch(url, {
				method: "PATCH",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					"X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')
						?.content,
				},
				body: JSON.stringify({
					is_manually_full: nextValue,
				}),
			});

			if (response.ok) {
				updateSlot(slot.id, { is_manually_full: nextValue });
				router.reload({ only: ["racks", "occupancy"], preserveState: true, preserveScroll: true });
				return;
			}

			const data = await response.json().catch(() => ({}));
			toast.error(data?.message || "Could not update the slot. Please try again.");
		} catch (error) {
			console.error(error);
			toast.error("Network error. The slot was not updated.");
		}
	};

	return (
		<div
			role="button"
			onClick={() => {
				if (!isSlotEnabled) return;
				// A full slot can still be picked in the stock dialog, to join the boxes already in it.
				if (isManuallyFull && !(multiSelect && hasLots)) return;
				onPick?.(slot);
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className={clsx(
				"btn min-h-12 z-20 border transition-all py-1 flex flex-col items-center justify-center relative group",
				multiSelect && isSelected && "ring-2 ring-primary animate-pulse",
				"rounded-none -ml-[1px] -mt-[1px]",
				{
					"bg-rose-500 border-rose-700 cursor-not-allowed": isManuallyFull,
					"bg-black border-black": !isSlotEnabled,
					"min-w-15 text-xs font-mono p-0": !isDetailedView,
					"font-extrabold border-accent bg-accent/10": isHighlighted,
					"!border-base-content/20":
						!isHighlighted && !hasLots && !isManuallyFull,
					"border-violet bg-violet/10":
						!isHighlighted && hasLots && !isLargeLot,
					"border-secondary bg-secondary/20": !isHighlighted && isLargeLot,
					"ring-2 ring-white ring-offset-2 ring-offset-slate-950 animate-pulse":
						isActive,
					"outline-2 outline-dashed outline-info outline-offset-[-3px]": !!recommendedRank,
				},
			)}
		>
			<div
				className={clsx(
					"absolute left-0 -top-8 flex transition-all duration-200 ease-out",
					{
						"opacity-100 translate-y-0 pointer-events-auto": hovered,
						"opacity-0 -translate-y-2 pointer-events-none": !hovered,
					},
				)}
			>
				<button
					type="button"
					className={clsx(
						"btn text-neutral hover:bg-primary bg-accent z-100 text-sm rounded",
					)}
					onClick={(e) => {
						e.stopPropagation();
						handleMarkSlotFullToggle();
					}}
				>
					{isManuallyFull ? "Mark as Empty" : "Mark as Full"}
				</button>
			</div>

			{multiSelect && !isManuallyFull && (
				<div className="absolute top-0 right-0">
					<input
						type="checkbox"
						className="checkbox rounded-none checkbox-sm checkbox-primary"
						readOnly
						checked={isSelected}
					/>
				</div>
			)}

			{recommendedRank && (
				<div
					className="absolute bottom-0.5 left-0.5 z-30 flex h-4 w-4 items-center justify-center rounded-full bg-info text-info-content text-[10px] font-black"
					title="Recommended"
				>
					{recommendedTotal > 1 ? recommendedRank : "★"}
				</div>
			)}

			{isActive && (
				<div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce">
					<PiArrowFatDownFill />
				</div>
			)}

			{hasExceededAgeThreshold && (
				<div className="absolute bottom-0 right-0 animate-status-shift text-yellow-500">
					aged
				</div>
			)}

			<span
				className={clsx("font-bold text-lg", {
					"text-[9px] absolute top-1 text-base-content left-1": isDetailedView,
					"text-white/50": !isSlotEnabled && !isManuallyFull,
					"text-neutral": isManuallyFull,
				})}
			>
				{isManuallyFull ? "Full" : isSlotEnabled ? slotLabel : <FaTimes />}
			</span>

			{isDetailedView &&
				(isManuallyFull ? (
					<span className="text-[20px] font-black text-base-content uppercase">
						Full
					</span>
				) : hasLots ? (
					<div className="text-center">
						<div className="text-xs font-black text-base-content">
							{isMultiLot ? `${lots.length}` : lots[0].id}
						</div>
						{isLargeLot && (
							<div className="text-[8px] text-indigo-400 font-bold uppercase mt-1">
								Multi-Slot
							</div>
						)}
					</div>
				) : (
					<span className="text-[9px] bg-stripes font-bold text-base-content uppercase group-hover:text-slate-500">
						Empty
					</span>
				))}
		</div>
	);
});

function SlotDetailPanel({ slot, occupancy }) {
	const racks = useInternalStore((state) => state.racks);
	const clearSelectedSlot = useInternalStore(
		(state) => state.clearSelectedSlot,
	);

	// slot id -> label, so each "Occupies" chip shows its own slot (it used to repeat the selected slot's label).
	const labelById = useMemo(() => {
		const map = new Map();
		for (const rack of racks) {
			for (const slots of Object.values(rack.shelves ?? {})) {
				for (const s of slots) map.set(s.id, s.label || s.meta?.label);
			}
		}
		return map;
	}, [racks]);

	const lots = slot ? (occupancy?.[slot.id] ?? slot.lots ?? NO_LOTS) : NO_LOTS;

	return (
		<>
			<div
				onClick={clearSelectedSlot}
				className={clsx(
					"fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 z-40",
					slot
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none",
				)}
			/>

			<div
				className={clsx(
					"h-full fixed right-0 z-50 top-0 flex flex-col bg-base-200 border-l border-base-300/50 transition-all ease-in-out pt-12 pb-16 shadow-2xl animate-in slide-in-from-right duration-300",
					slot
						? "w-96 opacity-100 translate-x-0"
						: "w-0 opacity-0 translate-x-10 border-none",
				)}
			>
				<div className="flex px-4 justify-between items-center mb-4">
					<h3 className="text-xl font-bold">
						Slot {slot?.label || slot?.meta?.label} Manifest
					</h3>
					<button
						type="button"
						onClick={clearSelectedSlot}
						className="text-slate-500 hover:text-base-content btn btn-ghost"
					>
						<FaTimes />
					</button>
				</div>

				<div className="space-y-2 px-4 overflow-y-auto">
					{lots.length > 0 ? (
						lots.map((lot) => (
							<div
								key={lot.id}
								className="relative bg-base-300/50 p-2 rounded-lg border border-base-content/50"
							>
								<div className="flex justify-between mb-2">
									<span className="text-blue-400 font-black text-sm">
										{lot.id}
									</span>
									<span className="text-[10px] bg-base-400 px-2 py-0.5 rounded-lg text-base-content font-bold uppercase">
										Qty: {lot.qty}
									</span>
								</div>
								{lot?.has_exceeded_age_threshold && (
									<div className="absolute top-1 right-1 animate-status-shift text-yellow-500">
										aged
									</div>
								)}
								<p className="text-sm font-medium text-base-content">
									{lot.part}
								</p>
								<div className="mt-4 flex gap-1 items-center justify-between">
									<div className="flex gap-1 items-center">
										<span className="text-[10px] text-base-content uppercase font-bold">
											Occupies:
										</span>
										{(lot.slot_ids ?? []).map((s) => (
											<span
												key={s}
												className="text-[12px] bg-accent text-accent-content px-1.5 rounded-sm"
											>
												{labelById.get(s) ?? s}
											</span>
										))}
									</div>

									<button
										type="button"
										className="btn btn-sm btn-error text-white"
									>
										release
									</button>
								</div>
							</div>
						))
					) : (
						<div className="text-center py-20 text-base-content italic">
							No lots currently assigned.
						</div>
					)}
				</div>
			</div>
		</>
	);
}