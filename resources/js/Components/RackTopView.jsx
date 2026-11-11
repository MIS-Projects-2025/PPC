import { blockKey, layoutFromBlocks } from "@/Constants/rackLayout";
import clsx from "clsx";
import React, { useEffect, useMemo, useState } from "react";

const NO_LOTS = [];
const NO_RACKS = [];
const NO_OCCUPANCY = {};
const EMPTY_SET = new Set();

// Accepts a Set (used as-is, never copied, so in-place mutations are always seen), an array, or nothing.
function toSet(value) {
	if (value instanceof Set) return value;
	if (Array.isArray(value)) return new Set(value);
	return EMPTY_SET;
}

// ---- slot status helpers (same states/colors as SlotButton in the grid view) ----

function slotState(slot, lots) {
	if (slot?.is_manually_full) return "full";
	if (!slot?.is_active) return "disabled";
	if (lots.length === 0) return "empty";
	return lots.some((l) => l.slot_ids?.length > 1) ? "multi" : "occupied";
}

// Solid fill for the thin segments shown on the block at rest.
const SEGMENT_CLASS = {
	full: "bg-rose-500",
	disabled: "bg-black",
	empty: "bg-base-100",
	occupied: "bg-violet/40",
	multi: "bg-secondary/50",
};

// Bordered style for the rows inside the hover popover.
const ROW_CLASS = {
	full: "border-rose-700 bg-rose-500 text-neutral",
	disabled: "border-black bg-black text-white/50",
	empty: "border-base-content/20 bg-base-100",
	occupied: "border-violet bg-violet/10",
	multi: "border-secondary bg-secondary/20",
};

// Row style when the slot belongs to the same lot as the selected slot.
const ROW_HIGHLIGHT_CLASS = "border-accent bg-accent/10";

export default function RackTopView({
	racks,
	occupancy,
	selectedSlot,
	selectedSlotIds,
	multiSelect,
	recommendedRanks,
	onSlotPick,
	floorMaps, // several maps, one canvas per rack page: [{ rack_page_id, key, id, width, height, blocks }]
	floorMap, // or a single map (same shape), e.g. the Rack page of one production line
}) {
	const [openId, setOpenId] = useState(null);

	// Close the popover when clicking/tapping outside any shelf, or pressing Escape.
	// (Touch screens never fire mouseleave reliably, so without this the popover and its
	// highlight would stay stuck open.)
	useEffect(() => {
		if (openId == null) return undefined;
		const onPointerDown = (e) => {
			if (!e.target.closest?.("[data-shelf-id]")) setOpenId(null);
		};
		const onKeyDown = (e) => {
			if (e.key === "Escape") setOpenId(null);
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [openId]);

	const safeOccupancy = occupancy ?? NO_OCCUPANCY;
	const safeRacks = racks ?? NO_RACKS;

	// Deliberately NOT memoized: the parent may mutate these Sets in place, and a memo keyed on
	// the (unchanged) reference would keep showing stale highlights after un-clicking a slot.
	// Only count "picked" slots in multi-select mode, same as the popover rows.
	const pickedIds = multiSelect ? toSet(selectedSlotIds) : EMPTY_SET;

	// Slots that belong to the same lot as the currently selected slot.
	const highlightedSlotIds = (() => {
		if (!selectedSlot) return EMPTY_SET;
		const lots = safeOccupancy[String(selectedSlot.id)] ?? NO_LOTS;
		return new Set(lots.flatMap((l) => l.slot_ids ?? []));
	})();

	const maps = floorMaps ?? (floorMap ? [floorMap] : null);

	if (!maps?.length) {
		return (
			<div className="rounded-lg border border-dashed border-base-300 p-6 text-sm text-base-content/70">
				No floor map to show. The page needs to pass <code>floorMaps</code> (or <code>floorMap</code>).
			</div>
		);
	}

	const several = maps.length > 1;

	return (
		<div className="w-full space-y-6">
			{maps.map((map, index) => (
				<FloorSection
					key={map.rack_page_id ?? map.id ?? `map-${index}`}
					map={map}
					// With one map every rack belongs to it, even if racks don't carry rack_page_id.
					racks={several ? safeRacks.filter((r) => r.rack_page_id === map.rack_page_id) : safeRacks}
					title={several ? map.key : null}
					openId={openId}
					setOpenId={setOpenId}
					occupancy={safeOccupancy}
					selectedSlot={selectedSlot}
					pickedIds={pickedIds}
					highlightedSlotIds={highlightedSlotIds}
					recommendedRanks={recommendedRanks}
					multiSelect={multiSelect}
					onSlotPick={onSlotPick}
				/>
			))}

			<Legend />
		</div>
	);
}

// One canvas: the racks of one rack page placed on that page's floor map.
function FloorSection({
	map,
	racks,
	title,
	openId,
	setOpenId,
	occupancy,
	selectedSlot,
	pickedIds,
	highlightedSlotIds,
	recommendedRanks,
	multiSelect,
	onSlotPick,
}) {
	const floor = useMemo(() => ({ width: map.width, height: map.height }), [map]);
	const layout = useMemo(() => layoutFromBlocks(map.blocks ?? []) ?? {}, [map]);

	// Every key in rack.shelves ("A", "B", ... "AZ") becomes one block on the map,
	// holding that shelf's slots in array order (slot 1 = top ... slot 4 = bottom).
	const placed = useMemo(() => {
		const blocks = racks.flatMap((rack) =>
			Object.entries(rack.shelves ?? {}).map(([label, slots]) => ({
				id: blockKey(rack.id, label),
				label,
				rackLabel: rack.label,
				slots: Array.isArray(slots) ? slots : [],
			})),
		);

		// Shelves without a saved position go in a strip below the floor.
		const cols = Math.max(1, Math.floor(floor.width / 2));
		let unmapped = 0;
		return blocks.map((block) => {
			const spot = layout[block.id];
			if (spot) return { block, box: spot, mapped: true };
			const i = unmapped++;
			return {
				block,
				mapped: false,
				box: {
					x: (i % cols) * 2,
					y: floor.height + 1 + Math.floor(i / cols),
					w: 2,
					h: 1,
				},
			};
		});
	}, [racks, layout, floor]);

	const hasUnmapped = placed.some((p) => !p.mapped);

	// Logical size of the canvas, in grid cells (floor + the "not placed" strip + anything outside the floor).
	// Never 0, so the percentage math below can't divide by zero.
	const canvas = {
		w: Math.max(1, floor.width || 0, ...placed.map((p) => p.box.x + p.box.w)),
		h: Math.max(1, floor.height || 0, ...placed.map((p) => p.box.y + p.box.h)),
	};

	if (racks.length === 0) return null;

	return (
		<section>
			{title && <h3 className="mb-1 text-sm font-bold uppercase tracking-tight">{title}</h3>}

			{map.id == null ? (
				<div className="rounded-lg border border-dashed border-base-300 p-4 text-xs text-base-content/70">
					No floor map saved for this page yet. Open the layout editor to place its shelves.
				</div>
			) : (
				<div className="rounded-lg border border-base-300 bg-base-200/40 p-4">
					{/* Fills the width; height always follows the floor's aspect ratio */}
					<div
						className="relative mx-auto w-full"
						style={{
							aspectRatio: `${canvas.w} / ${canvas.h}`,
							maxWidth: `calc((100vh - 12rem) * ${canvas.w / canvas.h})`, // 12rem ≈ space used by headers/legend
						}}
					>
						{hasUnmapped && (
							<div
								className="absolute text-[10px] text-warning"
								style={{
									left: 0,
									top: `${((floor.height + 0.4) / canvas.h) * 100}%`,
								}}
							>
								Not placed yet (use the layout editor)
							</div>
						)}

						{placed.map(({ block, box }) => (
							<ShelfBlock
								key={block.id}
								block={block}
								box={box}
								canvas={canvas}
								isOpen={openId === block.id}
								setOpenId={setOpenId}
								occupancy={occupancy}
								selectedSlot={selectedSlot}
								pickedIds={pickedIds}
								highlightedSlotIds={highlightedSlotIds}
								recommendedRanks={recommendedRanks}
								multiSelect={multiSelect}
								onSlotPick={onSlotPick}
							/>
						))}
					</div>
				</div>
			)}
		</section>
	);
}

function ShelfBlock({
	block,
	box,
	canvas,
	isOpen,
	setOpenId,
	occupancy,
	selectedSlot,
	pickedIds,
	highlightedSlotIds,
	recommendedRanks,
	multiSelect,
	onSlotPick,
}) {
	const { id, label, slots } = block;

	// Computed on every render (cheap: a handful of slots per shelf). Memoizing this on Set
	// references made the ring/highlight stick when the parent mutated a Set in place.
	const selectedId = selectedSlot?.id;
	const flags = {
		active: selectedId != null && slots.some((s) => s.id === selectedId),
		highlighted: slots.some((s) => highlightedSlotIds.has(s.id)),
		picked: slots.some((s) => pickedIds.has(s.id)),
		recommended: slots.some((s) => recommendedRanks?.has(s.id)),
	};

	// Open away from the nearest floor edge so the popover stays visible.
	const openBelow = box.y < canvas.h / 2;
	const alignRight = box.x > canvas.w / 2;

	// One border color only (conflicting Tailwind border-* classes are resolved by
	// stylesheet order, not class order, which made the result unpredictable).
	const borderClass = isOpen
		? "border-primary shadow-lg"
		: flags.highlighted
			? "border-accent"
			: "border-base-content/40";

	return (
		<div
			className="absolute"
			data-shelf-id={id}
			style={{
				left: `${(box.x / canvas.w) * 100}%`,
				top: `${(box.y / canvas.h) * 100}%`,
				width: `${(box.w / canvas.w) * 100}%`,
				height: `${(box.h / canvas.h) * 100}%`,
				zIndex: isOpen ? 40 : 10,
				containerType: "size", // lets the label scale with the block (cqmin units)
			}}
			onMouseEnter={() => setOpenId(id)}
			onMouseLeave={() => setOpenId(null)}
			onFocus={() => setOpenId(id)}
			onBlur={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget)) setOpenId(null);
			}}
		>
			{/* The block itself: equal segments, one per slot, with the letter on top */}
			<button
				type="button"
				onClick={() => setOpenId(id)} // tap-to-open on touch screens
				aria-label={`Shelf ${label}`}
				title={`${block.rackLabel} · Shelf ${label}`}
				aria-expanded={isOpen}
				className={clsx(
					"relative flex h-full w-full overflow-hidden rounded-md border transition-colors",
					box.h > box.w && "flex-col",
					borderClass,
					(flags.active || flags.picked) && "ring-2 ring-primary",
					flags.recommended &&
						"outline-2 outline-dashed outline-info outline-offset-2",
				)}
			>
				{slots.map((slot) => {
					const state = slotState(slot, occupancy[slot.id] ?? NO_LOTS);
					const hl = highlightedSlotIds.has(slot.id) && state !== "full" && state !== "disabled";
					return (
						<span
							key={slot.id}
							className={clsx(
								"flex-1 border-base-content/20",
								box.h > box.w
									? "w-full border-b last:border-b-0"
									: "h-full border-r last:border-r-0",
								hl ? "bg-accent/50" : SEGMENT_CLASS[state],
							)}
						/>
					);
				})}
				<span className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<span
						className="rounded bg-base-100/90 px-1 font-black leading-tight"
						style={{ fontSize: "clamp(8px, 40cqmin, 28px)" }}
					>
						{label}
					</span>
				</span>
				{flags.recommended && (
					<span className="absolute right-0.5 top-0 text-[10px] text-info">★</span>
				)}
			</button>

			{isOpen && (
				// Child of the hover wrapper and touching the block (padding, not margin),
				// so moving the cursor from block to popover never closes it.
				<div
					className={clsx(
						"absolute w-44",
						openBelow ? "top-full pt-1" : "bottom-full pb-1",
						alignRight ? "right-0" : "left-0",
					)}
				>
					<div className="rounded-lg border border-base-300 bg-base-100 p-1.5 shadow-2xl">
						<div className="px-1 pb-1 text-sm font-bold">Shelf {label}</div>
						<div className="flex flex-col gap-1">
							{slots.map((slot, i) => (
								<SlotRow
									key={slot.id}
									index={i + 1}
									slot={slot}
									lots={occupancy[slot.id] ?? NO_LOTS}
									isActive={selectedId != null && selectedId === slot.id}
									isHighlighted={highlightedSlotIds.has(slot.id)}
									isSelected={pickedIds.has(slot.id)}
									multiSelect={multiSelect}
									isRecommended={!!recommendedRanks?.has(slot.id)}
									recommendedRank={recommendedRanks?.get?.(slot.id)}
									recommendedTotal={recommendedRanks?.size ?? 0}
									onPick={onSlotPick}
								/>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// One slot in the popover. Listed top to bottom: 1 is the top slot, 4 the bottom.
function SlotRow({
	index,
	slot,
	lots,
	isActive,
	isHighlighted,
	isSelected, // already false unless multiSelect is on (see pickedIds in RackTopView)
	multiSelect,
	isRecommended,
	recommendedRank,
	recommendedTotal,
	onPick,
}) {
	const state = slotState(slot, lots);
	// A full slot holding lots can still be picked in the stock dialog, to join the boxes already in it.
	// The server still rejects a normal lot into a full slot unless "Same boxes as" was used.
	const blocked = state === "disabled" || (state === "full" && !(multiSelect && lots.length > 0));
	const slotLabel = slot?.label || slot?.meta?.label;

	const text =
		state === "full"
			? "Full"
			: state === "disabled"
				? "Disabled"
				: state === "empty"
					? "Empty"
					: lots.length > 1
						? `${lots.length} lots`
						: lots[0].id;

	return (
		<button
			type="button"
			aria-disabled={blocked}
			title={slotLabel}
			onClick={() => {
				if (!blocked) onPick?.(slot);
			}}
			className={clsx(
				"relative flex h-9 w-full items-center gap-2 rounded border px-2 text-left transition-colors",
				// One border/background set only, so the highlight never fights with the state colors.
				!blocked && state !== "full" && isHighlighted ? ROW_HIGHLIGHT_CLASS : ROW_CLASS[state],
				blocked ? "cursor-not-allowed" : "hover:border-primary",
				(isActive || isSelected) && "ring-2 ring-primary",
				isRecommended && "outline-2 outline-dashed outline-info outline-offset-[-3px]",
			)}
		>
			<span className="w-3 text-center text-sm font-black">{index}</span>
			<span className="min-w-0 flex-1 truncate text-lg">{text}</span>
			{isRecommended && (
				<span className="flex h-4 w-4 items-center justify-center rounded-full bg-info text-[10px] font-black text-info-content">
					{recommendedTotal > 1 && recommendedRank != null ? recommendedRank : "★"}
				</span>
			)}
		</button>
	);
}

function Legend() {
	const items = [
		["border border-base-content/20", "Empty"],
		["border border-violet bg-violet/10", "Occupied"],
		["border border-secondary bg-secondary/20", "Multi-slot lot"],
		["border border-rose-700 bg-rose-500", "Full"],
		["border border-black bg-black", "Disabled"],
		["border-2 border-dashed border-info", "Recommended"],
	];
	return (
		<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/70">
			{items.map(([cls, text]) => (
				<span key={text} className="flex items-center gap-1.5">
					<span className={clsx("inline-block h-3 w-4", cls)} />
					{text}
				</span>
			))}
		</div>
	);
}