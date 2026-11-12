import { blockKey, layoutFromBlocks } from "@/Constants/rackLayout";
import { Link } from '@inertiajs/react';
import clsx from "clsx";
import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FiLayout } from 'react-icons/fi';

const NO_LOTS = [];
const NO_RACKS = [];
const NO_OCCUPANCY = {};
const EMPTY_SET = new Set();
const EMPTY_MAP = new Map();

// Which lot group is highlighted across the whole floor (hovered, or pinned by a click).
// A context so the group state does not have to be threaded through FloorSection and ShelfBlock.
const GroupFocusContext = createContext({
	active: null,
	pinned: null,
	activeSlots: null,
	groupLots: EMPTY_MAP,
	groupSlots: EMPTY_MAP,
	colorOf: (key, alpha = 1) => groupColor(key, alpha),
	hover: () => {},
	togglePin: () => {},
});

// Accepts a Set (used as-is, never copied, so in-place mutations are always seen), an array, or nothing.
function toSet(value) {
	if (value instanceof Set) return value;
	if (Array.isArray(value)) return new Set(value);
	return EMPTY_SET;
}

// ---- lot groups ----
// release_group = lots that leave the rack together (same external group). A lot without one is a group of one.
const groupKeyOf = (row) => row.release_group ?? `lot:${row.id}`;

// Stable color per group, from the key. Only used as a dot and as the highlight on the floor.
function groupColor(key, alpha = 1) {
	let h = 0;
	for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
	return `hsl(${h} 70% 50% / ${alpha})`;
}

// Lots that are alone in their group all share one neutral color, so only real groups get a distinct hue.
const SOLO_HUE = "hsl(215 14% 50%";
const soloColor = (alpha = 1) => `${SOLO_HUE} / ${alpha})`;

// depth_units: 2 = full depth (takes both lanes of the slot), 1 = mini (two fit across the depth).
const DEPTH_LABEL = { 1: "2 across", 2: "full depth" };

// The lots of one slot, grouped by release group, with one entry per physical box set inside each group.
// Lots that share boxes (same box_group_id) count their boxes once.
function buildGroups(lots) {
	const groups = new Map();

	for (const r of lots) {
		const key = groupKeyOf(r);
		let g = groups.get(key);
		if (!g) {
			g = { key, lots: [], sets: new Map(), aged: false };
			groups.set(key, g);
		}
		g.lots.push(r);
		g.aged = g.aged || !!r.has_exceeded_age_threshold;

		const boxes = r.slot_box_count ?? null;
		const set = {
			label: r.dimension_name ?? r.box_details ?? null,
			boxes,
			// A lot spread over several slots with the full count on each: the split is unknown, so it is an upper bound.
			approx: boxes != null && (r.slot_ids?.length ?? 1) > 1 && boxes === r.box_count,
			depth: DEPTH_LABEL[r.depth_units] ?? null,
			// Lots stocked before box info existed (or with a source row that has none).
			unknown: !r.dimension_name || boxes == null,
		};

		const setKey = r.box_group_id ?? `lot:${r.id}`;
		const prev = g.sets.get(setKey);
		if (!prev || (set.boxes ?? -1) > (prev.boxes ?? -1)) g.sets.set(setKey, set);
	}

	return [...groups.values()];
}

// Box sets with the same name and depth collapse into one line ("no box info ×9"),
// so lots stocked before box info existed do not flood the popover.
function mergeSets(sets) {
	const merged = new Map();

	for (const set of sets) {
		const key = `${set.label ?? ""}|${set.depth ?? ""}`;
		const m = merged.get(key);

		if (!m) {
			merged.set(key, { ...set, n: 1, missing: set.boxes == null });
			continue;
		}

		m.n += 1;
		m.unknown = m.unknown || set.unknown;
		m.approx = m.approx || set.approx;
		m.missing = m.missing || set.boxes == null;
		if (set.boxes != null) m.boxes = (m.boxes ?? 0) + set.boxes;
	}

	return [...merged.values()];
}

function mergedText(m) {
	const times = m.n > 1 ? `×${m.n}` : null;

	if (!m.label && m.boxes == null) return ["no box info", times].filter(Boolean).join(" ");

	const boxes =
		m.boxes == null
			? "boxes unknown"
			: `${m.approx ? "up to " : ""}${m.boxes}${m.missing ? "+" : ""} ${m.boxes === 1 && !m.missing ? "box" : "boxes"}`;

	return [m.label ?? "unknown box", boxes, m.depth, times].filter(Boolean).join(" · ");
}

function slotBoxSummary(groups) {
	let sum = 0;
	let unknown = false;
	let approx = false;

	for (const g of groups) {
		for (const s of g.sets.values()) {
			if (s.boxes == null) unknown = true;
			else sum += s.boxes;
			approx = approx || s.approx;
		}
	}

	return {
		unknown,
		text: sum > 0 ? `${approx ? "≤" : ""}${sum}${unknown ? "+" : ""} boxes` : null,
	};
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
	const [hoveredGroup, setHoveredGroup] = useState(null);
	const [pinnedGroup, setPinnedGroup] = useState(null);

	const safeOccupancy = occupancy ?? NO_OCCUPANCY;
	const safeRacks = racks ?? NO_RACKS;

	// group key -> slots it occupies / lots in it. occupancy is an Inertia prop, so a memo on it is safe.
	const { groupSlots, groupLots } = useMemo(() => {
		const slots = new Map();
		const lots = new Map();

		for (const rows of Object.values(safeOccupancy)) {
			for (const r of rows) {
				const key = groupKeyOf(r);
				if (!slots.has(key)) {
					slots.set(key, new Set());
					lots.set(key, new Set());
				}
				slots.get(key).add(r.rack_slot_id);
				lots.get(key).add(r.id);
			}
		}

		return { groupSlots: slots, groupLots: lots };
	}, [safeOccupancy]);

	// A pinned group that has left the rack (released) stops counting.
	const pinned = pinnedGroup && groupSlots.has(pinnedGroup) ? pinnedGroup : null;
	const active = hoveredGroup ?? pinned;

	const focus = useMemo(
		() => ({
			active,
			pinned,
			activeSlots: active ? (groupSlots.get(active) ?? null) : null,
			groupLots,
			groupSlots,
			// A group of one lot gets the fixed neutral color.
			colorOf: (key, alpha = 1) =>
				(groupLots.get(key)?.size ?? 0) > 1 ? groupColor(key, alpha) : soloColor(alpha),
			hover: setHoveredGroup,
			togglePin: (key) => setPinnedGroup((p) => (p === key ? null : key)),
		}),
		[active, pinned, groupSlots, groupLots],
	);

	// The popover unmounts under the cursor without firing mouseleave, so drop the hover whenever it changes.
	useEffect(() => {
		setHoveredGroup(null);
	}, [openId]);

	// Close the popover when clicking/tapping outside any shelf, or pressing Escape (Escape also clears the pin).
	// (Touch screens never fire mouseleave reliably, so without this the popover and its
	// highlight would stay stuck open.)
	useEffect(() => {
		if (openId == null && pinnedGroup == null) return undefined;
		const onPointerDown = (e) => {
			if (openId != null && !e.target.closest?.("[data-shelf-id]")) setOpenId(null);
		};
		const onKeyDown = (e) => {
			if (e.key === "Escape") {
				setOpenId(null);
				setPinnedGroup(null);
			}
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [openId, pinnedGroup]);

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
		<GroupFocusContext.Provider value={focus}>
			<div className="w-full space-y-6">
				<FocusBar
					pinned={pinned}
					groupLots={groupLots}
					groupSlots={groupSlots}
					onClear={() => setPinnedGroup(null)}
				/>

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
		</GroupFocusContext.Provider>
	);
}

// Fixed height so pinning a group never shifts the floor.
function FocusBar({ pinned, groupLots, groupSlots, onClear }) {
	const { colorOf } = useContext(GroupFocusContext);

	if (!pinned) {
		return (
			<div className="flex h-6 items-center text-xs text-base-content/50">
				Hover a lot to highlight its group on the floor. Click it to pin.
			</div>
		);
	}

	const lots = [...(groupLots.get(pinned) ?? [])];
	const slotCount = groupSlots.get(pinned)?.size ?? 0;

	return (
		<div className="flex h-6 items-center gap-2 text-xs">
			<span
				className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
				style={{ backgroundColor: colorOf(pinned) }}
			/>
			<span className="truncate font-bold">
				{lots.slice(0, 4).join(", ")}
				{lots.length > 4 ? ` +${lots.length - 4}` : ""}
			</span>
			<span className="shrink-0 text-base-content/70">
				{lots.length} {lots.length === 1 ? "lot" : "lots"} in {slotCount} {slotCount === 1 ? "slot" : "slots"}
			</span>
			<button type="button" className="btn btn-ghost btn-xs" onClick={onClear}>
				clear
			</button>
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
			{title && (
				<h3 className="mb-1 text-sm font-bold uppercase tracking-tight">
					<Link
						href={route('rack.layout-editor', title)}
						className="group inline-flex items-center gap-1.5 hover:text-blue-600"
						title="Open layout editor"
					>
						{title}
						<FiLayout className="text-xs" />
						<span className="text-xs font-thin opacity-50 transition-opacity duration-200 group-hover:opacity-100">
							EDIT
						</span>
					</Link>
				</h3>
			)}

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
	const { active, activeSlots, colorOf } = useContext(GroupFocusContext);

	// Computed on every render (cheap: a handful of slots per shelf). Memoizing this on Set
	// references made the ring/highlight stick when the parent mutated a Set in place.
	const selectedId = selectedSlot?.id;
	const flags = {
		active: selectedId != null && slots.some((s) => s.id === selectedId),
		highlighted: slots.some((s) => highlightedSlotIds.has(s.id)),
		picked: slots.some((s) => pickedIds.has(s.id)),
		recommended: slots.some((s) => recommendedRanks?.has(s.id)),
		inGroup: !!activeSlots && slots.some((s) => activeSlots.has(s.id)),
	};

	// Open toward the side with more room and cap the lists to that room. Otherwise a tall popover is cut off by
	// the scrolling container around the floor (<main> in Rack.jsx, the modal in the stock dialog) or runs off screen.
	const wrapRef = useRef(null);
	const [room, setRoom] = useState(null);
	const [hoverSlotId, setHoverSlotId] = useState(null);

	useLayoutEffect(() => {
		if (!isOpen || !wrapRef.current) return;

		const r = wrapRef.current.getBoundingClientRect();
		let top = 0;
		let bottom = window.innerHeight;
		let left = 0;
		let right = window.innerWidth;

		for (let el = wrapRef.current.parentElement; el; el = el.parentElement) {
			const cs = getComputedStyle(el);
			const clipsY = /(auto|scroll|hidden|clip)/.test(cs.overflowY);
			const clipsX = /(auto|scroll|hidden|clip)/.test(cs.overflowX);
			if (!clipsX && !clipsY) continue;

			const p = el.getBoundingClientRect();
			if (clipsY) {
				top = Math.max(top, p.top);
				bottom = Math.min(bottom, p.bottom);
			}
			if (clipsX) {
				left = Math.max(left, p.left);
				right = Math.min(right, p.right);
			}
		}

		setRoom({ above: r.top - top, below: bottom - r.bottom, left: r.right - left, right: right - r.left });
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) setHoverSlotId(null);
	}, [isOpen]);

	const openBelow = room ? room.below >= room.above : box.y < canvas.h / 2;
	const maxListHeight = room ? Math.max(160, (openBelow ? room.below : room.above) - 56) : undefined;
	// The slot list sits on the block's side; the lots panel opens further out, so it needs the room.
	const alignRight = room ? room.left > room.right : box.x > canvas.w / 2;

	const hoverSlot = hoverSlotId != null ? slots.find((s) => s.id === hoverSlotId) : null;
	const hoverLots = hoverSlot ? (occupancy[hoverSlot.id] ?? NO_LOTS) : NO_LOTS;

	// One border color only (conflicting Tailwind border-* classes are resolved by
	// stylesheet order, not class order, which made the result unpredictable).
	const borderClass = isOpen
		? "border-primary shadow-lg"
		: flags.highlighted
			? "border-accent"
			: "border-base-content/40";

	// The active group's color outlines every shelf that holds one of its slots.
	const groupStyle = flags.inGroup
		? { borderColor: colorOf(active), boxShadow: `0 0 0 2px ${colorOf(active)}` }
		: undefined;

	return (
		<div
			className="absolute"
			data-shelf-id={id}
			ref={wrapRef}
			style={{
				left: `${(box.x / canvas.w) * 100}%`,
				top: `${(box.y / canvas.h) * 100}%`,
				width: `${(box.w / canvas.w) * 100}%`,
				height: `${(box.h / canvas.h) * 100}%`,
				zIndex: isOpen ? 40 : flags.inGroup ? 30 : 10,
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
				style={groupStyle}
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
					const inGroup = !!activeSlots?.has(slot.id);
					return (
						<span
							key={slot.id}
							style={inGroup ? { backgroundColor: colorOf(active, 0.75) } : undefined}
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
						"absolute",
						openBelow ? "top-full pt-1" : "bottom-full pb-1",
						alignRight ? "right-0" : "left-0",
					)}
				>
					{/* The slot list stays on the block's side and keeps a fixed row height, so a slot is always where the
					    cursor left it. The lots of the hovered slot open beside it; that panel touches the list (padding,
					    not margin) and is as tall as the list at least, so the cursor can cross from a row into it. */}
					<div className={clsx("flex", alignRight && "flex-row-reverse")}>
						<div
							className={clsx(
								"w-60 shrink-0 rounded-lg border border-base-300 bg-base-100 p-1.5 shadow-2xl",
								openBelow ? "self-start" : "self-end",
							)}
						>
							<div className="px-1 pb-1 text-sm font-bold">Shelf {label}</div>
							<div
								className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto"
								style={{ maxHeight: maxListHeight }}
							>
								{slots.map((slot, i) => (
									<SlotRow
										key={slot.id}
										index={i + 1}
										slot={slot}
										lots={occupancy[slot.id] ?? NO_LOTS}
										isActive={selectedId != null && selectedId === slot.id}
										isHighlighted={highlightedSlotIds.has(slot.id)}
										isSelected={pickedIds.has(slot.id)}
										isHovered={hoverSlotId === slot.id}
										multiSelect={multiSelect}
										isRecommended={!!recommendedRanks?.has(slot.id)}
										recommendedRank={recommendedRanks?.get?.(slot.id)}
										recommendedTotal={recommendedRanks?.size ?? 0}
										onPick={onSlotPick}
										onHover={setHoverSlotId}
									/>
								))}
							</div>
						</div>

						{hoverLots.length > 0 && (
							<div className={clsx("flex", alignRight ? "pr-1" : "pl-1")}>
								<SlotLots slot={hoverSlot} lots={hoverLots} maxHeight={maxListHeight} />
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

// One slot in the popover list. Listed top to bottom: 1 is the top slot. Fixed height, one line: this is the
// click target for picking the slot. Hovering (or tapping / focusing) it opens the lots panel beside the list.
function SlotRow({
	index,
	slot,
	lots,
	isActive,
	isHighlighted,
	isSelected, // already false unless multiSelect is on (see pickedIds in RackTopView)
	isHovered,
	multiSelect,
	isRecommended,
	recommendedRank,
	recommendedTotal,
	onPick,
	onHover,
}) {
	const state = slotState(slot, lots);
	const groups = useMemo(() => buildGroups(lots), [lots]);
	const summary = slotBoxSummary(groups);
	const { groupLots } = useContext(GroupFocusContext);
	const realGroups = groups.filter((g) => (groupLots.get(g.key)?.size ?? 0) > 1);

	const blocked = state === "disabled" || (state === "full" && !(multiSelect && lots.length > 0));
	const slotLabel = slot?.label || slot?.meta?.label;

	// One group: its first lot id (+ the rest). Several: the counts. The lots panel has the detail.
	const extraLots = lots.length - 1;
	const lotText =
		groups.length === 1
			? `${groups[0].lots[0].id}${extraLots > 0 ? ` +${extraLots}` : ""}`
			: `${lots.length} lots${realGroups.length ? ` · ${realGroups.length} ${realGroups.length === 1 ? "group" : "groups"}` : ""}`;
	const headline =
		state === "disabled"
			? "Disabled"
			: state === "empty"
				? "Empty"
				: state === "full"
					? lots.length
						? `Full · ${lotText}`
						: "Full"
					: lotText;

	return (
		<button
			type="button"
			aria-disabled={blocked}
			title={slotLabel}
			onMouseEnter={() => onHover?.(slot.id)}
			onFocus={() => onHover?.(slot.id)}
			onClick={() => {
				onHover?.(slot.id); // on a touch screen the tap is the only "hover"
				if (!blocked) onPick?.(slot);
			}}
			className={clsx(
				"relative flex h-9 w-full shrink-0 items-center gap-2 rounded border px-2 text-left transition-colors",
				// One border/background set only, so the highlight never fights with the state colors.
				!blocked && state !== "full" && isHighlighted ? ROW_HIGHLIGHT_CLASS : ROW_CLASS[state],
				blocked ? "cursor-not-allowed" : "hover:border-primary",
				isHovered && "border-primary",
				(isActive || isSelected) && "ring-2 ring-primary",
				isRecommended && "outline-2 outline-dashed outline-info outline-offset-[-3px]",
			)}
		>
			<span className="w-3 shrink-0 text-center text-sm font-black">{index}</span>
			<span className="min-w-0 flex-1 truncate text-sm font-semibold">{headline}</span>
			{groups.length > 0 && (
				<span className="flex shrink-0 gap-0.5">
					{realGroups.slice(0, 4).map((g) => (
						<span
							key={g.key}
							className="h-2 w-2 rounded-full"
							style={{ backgroundColor: groupColor(g.key) }}
						/>
					))}
				</span>
			)}
			{summary.text && <span className="shrink-0 text-[11px] opacity-80">{summary.text}</span>}
			{summary.unknown && (
				<span
					className="badge badge-warning badge-xs shrink-0"
					title="A lot here has no usable box info, so the recommendation model skips this slot."
				>
					?
				</span>
			)}
			{isRecommended && (
				<span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-info text-[10px] font-black text-info-content">
					{recommendedTotal > 1 && recommendedRank != null ? recommendedRank : "★"}
				</span>
			)}
		</button>
	);
}

// The lots of the hovered slot, beside the slot list: one entry per lot group.
function SlotLots({ slot, lots, maxHeight }) {
	const groups = useMemo(() => buildGroups(lots), [lots]);
	const summary = slotBoxSummary(groups);

	return (
		<div className="w-72 rounded-lg border border-base-300 bg-base-100 p-1.5 shadow-2xl">
			<div className="flex items-baseline gap-2 px-1 pb-1">
				<span className="text-sm font-bold">Slot {slot?.label || slot?.meta?.label}</span>
				<span className="text-[11px] opacity-70">
					{lots.length} {lots.length === 1 ? "lot" : "lots"}
					{summary.text ? ` · ${summary.text}` : ""}
				</span>
			</div>
			<div className="flex flex-col overflow-y-auto" style={{ maxHeight }}>
				{groups.map((g) => (
					<GroupLine key={g.key} group={g} />
				))}
			</div>
		</div>
	);
}

// One lot group inside a slot: lot id (+ the others), what boxes it holds here, and where else it sits.
function GroupLine({ group }) {
	const { active, pinned, groupSlots, colorOf, hover, togglePin } = useContext(GroupFocusContext);

	const isActive = active === group.key;
	const isPinned = pinned === group.key;
	const otherSlots = Math.max(0, (groupSlots.get(group.key)?.size ?? 1) - 1);
	const extra = group.lots.length - 1;

	const tip = group.lots
		.map((l) => `${l.id} · ${l.partname ?? "no partname"} · qty ${Number(l.qty ?? 0).toLocaleString()}`)
		.join("\n");

	return (
		<button
			type="button"
			title={tip}
			onClick={(e) => {
				e.stopPropagation(); // clicking a group pins it, it must not pick the slot
				togglePin(group.key);
			}}
			onMouseEnter={() => hover(group.key)}
			onMouseLeave={() => hover(null)}
			className={clsx(
				"flex w-full shrink-0 items-start gap-1.5 rounded px-1 py-0.5 text-left",
				isActive && "bg-base-content/10",
				isPinned && "ring-1 ring-primary",
			)}
		>
			<span
				className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
				style={{ backgroundColor: colorOf(group.key) }}
			/>
			<span className="min-w-0 flex-1">
				<span className="flex items-baseline gap-1.5">
					<span className="truncate text-sm font-bold">{group.lots[0].id}</span>
					{extra > 0 && (
						<span className="shrink-0 text-[10px] opacity-70">
							+{extra} {extra === 1 ? "lot" : "lots"}
						</span>
					)}
					{group.aged && <span className="shrink-0 text-[10px] text-warning">aged</span>}
					{otherSlots > 0 && (
						<span className="ml-auto shrink-0 text-[10px] text-info">
							also in {otherSlots} other {otherSlots === 1 ? "slot" : "slots"}
						</span>
					)}
				</span>
				{mergeSets([...group.sets.values()]).map((set, i) => (
					<span
						key={i}
						className={clsx("block truncate text-[11px]", set.unknown ? "text-warning" : "opacity-80")}
					>
						{mergedText(set)}
					</span>
				))}
			</span>
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