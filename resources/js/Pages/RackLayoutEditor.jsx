import {
	STARTER_FLOOR,
	STARTER_LAYOUT,
	blockKey,
	blocksFromLayout,
	layoutFromBlocks,
} from "@/Constants/rackLayout";
import { useToast } from "@/Hooks/useToast";
import clsx from "clsx";
import React, { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SLOTS_PER_SHELF = 4;
const DEFAULT_FLOOR = { width: 28, height: 12 }; // same defaults as the migration
const MAX_FLOOR = 80; // keep in sync with SaveRackFloorMapRequest
const MAX_BLOCK = 10; // max block width/height in cells, same limit as SaveRackFloorMapRequest

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const sortLabels = (a, b) => a.length - b.length || a.localeCompare(b); // A..Z, AA..AZ

const overlaps = (a, b) =>
	a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Stable string so "dirty" ignores key order.
const serialize = (layout, floor) =>
	JSON.stringify([
		floor.width,
		floor.height,
		Object.keys(layout)
			.sort()
			.map((k) => [k, layout[k].x, layout[k].y, layout[k].w, layout[k].h]),
	]);

// Server payload ({ width, height, blocks }) -> editor state.
// Positions for shelves that no longer exist are dropped, so the next save cleans them up.
function toState(blocks, map) {
	const keys = new Set(blocks.map((b) => b.key));
	const layout = Object.fromEntries(
		Object.entries(layoutFromBlocks(map?.blocks)).filter(([k]) => keys.has(k)),
	);
	return {
		layout,
		floor: { width: map?.width ?? DEFAULT_FLOOR.width, height: map?.height ?? DEFAULT_FLOOR.height },
	};
}

/**
 * Inertia page: resources/js/Pages/RackLayoutEditor.jsx
 * Props from RackController@layoutEditor:
 *   racks     racks of this rack page, each with `shelves` (same shape the Rack page uses)
 *   rackPage  the RackPage model ({ id, key, ... })
 *   floorMap  { id, width, height, blocks: [{ rack_id, shelf_label, x, y, w, h }] }
 */
export default function RackLayoutEditor({ racks = [], rackPage, floorMap }) {
	const toast = useToast();

	// One block per shelf per rack. `key` is what the layout is indexed by.
	const blocks = useMemo(
		() =>
			racks.flatMap((rack) =>
				Object.entries(rack.shelves ?? {})
					.sort(([a], [b]) => sortLabels(a, b))
					.map(([label, slots]) => ({
						key: blockKey(rack.id, label),
						label,
						rackLabel: rack.label,
						count: slots?.length || DEFAULT_SLOTS_PER_SHELF,
					})),
			),
		[racks],
	);
	const byKey = useMemo(() => Object.fromEntries(blocks.map((b) => [b.key, b])), [blocks]);

	const [saved, setSaved] = useState(() => toState(blocks, floorMap)); // last state the DB has
	const [layout, setLayout] = useState(saved.layout);
	const [floor, setFloor] = useState(saved.floor);
	const [selected, setSelected] = useState(null);
	const [drag, setDrag] = useState(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState("");

	const canvasRef = useRef(null);
	const timer = useRef(null);

	const flash = (text) => {
		setMessage(text);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setMessage(""), 3500);
	};

	const dirty = useMemo(
		() => serialize(layout, floor) !== serialize(saved.layout, saved.floor),
		[layout, floor, saved],
	);

	// Warn before closing the tab with unsaved changes.
	useEffect(() => {
		if (!dirty) return;
		const handler = (e) => {
			e.preventDefault();
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [dirty]);

	// Placed blocks use their layout entry. Unplaced ones wait in a strip under the floor.
	const { boxes, rows, unplacedCount } = useMemo(() => {
		const cols = Math.max(1, Math.floor(floor.width / 2));
		let u = 0;
		const out = {};
		for (const b of blocks) {
			const placed = layout[b.key];
			if (placed) {
				out[b.key] = { ...placed, placed: true };
			} else {
				out[b.key] = {
					x: (u % cols) * 2,
					y: floor.height + 1 + Math.floor(u / cols),
					w: 2,
					h: 1,
					placed: false,
				};
				u++;
			}
		}
		const bottom = Math.max(floor.height, ...Object.values(out).map((b) => b.y + b.h));
		return { boxes: out, rows: bottom, unplacedCount: u };
	}, [blocks, layout, floor]);

	// Must be fully on the floor and not touching another placed block.
	const isValid = (key, box) => {
		if (box.x < 0 || box.y < 0) return false;
		if (box.x + box.w > floor.width || box.y + box.h > floor.height) return false;
		return Object.entries(layout).every(([other, b]) => other === key || !overlaps(box, b));
	};

	const commit = (key, box, failMessage) => {
		if (!isValid(key, box)) {
			flash(failMessage ?? "Can't place it there: it overlaps another block or leaves the floor.");
			return false;
		}
		setLayout((prev) => ({ ...prev, [key]: box }));
		return true;
	};

	const rotate = (key) => {
		const b = layout[key];
		if (!b) return flash("Drag it onto the floor first.");
		commit(key, { x: b.x, y: b.y, w: b.h, h: b.w }, "Can't rotate here: no room.");
	};

	const resize = (key, patch) => {
		const b = layout[key];
		if (!b) return flash("Drag it onto the floor first.");
		commit(key, { ...b, ...patch }, "Can't resize: it would overlap another block or leave the floor.");
	};

	const unplace = (key) => {
		setLayout((prev) => {
			const { [key]: _removed, ...rest } = prev;
			return rest;
		});
	};

	// Fill in unplaced shelves from the hardcoded template (matched by shelf letter).
	const applyStarter = () => {
		const next = { ...layout };
		let added = 0;
		for (const b of blocks) {
			const spot = STARTER_LAYOUT[b.label.trim().toUpperCase()];
			if (!spot || next[b.key]) continue;
			if (Object.values(next).every((o) => !overlaps(spot, o))) {
				next[b.key] = { ...spot };
				added++;
			}
		}
		setFloor((f) => ({
			width: Math.max(f.width, STARTER_FLOOR.width),
			height: Math.max(f.height, STARTER_FLOOR.height),
		}));
		setLayout(next);
		flash(added ? `Placed ${added} shelves from the starter layout.` : "Nothing new to place.");
	};

	// ---- dragging (pointer events, snaps to the cell grid) ----

	const onPointerDown = (e, key) => {
		if (e.button !== 0) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		canvasRef.current.focus({ preventScroll: true });
		const b = boxes[key];
		const rect = canvasRef.current.getBoundingClientRect();
		const cell = rect.width / floor.width;
		setSelected(key);
		setDrag({
			key,
			grab: { x: e.clientX - rect.left - b.x * cell, y: e.clientY - rect.top - b.y * cell },
			box: { x: b.x, y: b.y, w: b.w, h: b.h },
		});
	};

	const onPointerMove = (e) => {
		if (!drag) return;
		const rect = canvasRef.current.getBoundingClientRect();
		const cell = rect.width / floor.width;
		const x = clamp(Math.round((e.clientX - rect.left - drag.grab.x) / cell), 0, floor.width - drag.box.w);
		const y = clamp(Math.round((e.clientY - rect.top - drag.grab.y) / cell), 0, rows - drag.box.h);
		if (x !== drag.box.x || y !== drag.box.y) {
			setDrag((d) => ({ ...d, box: { ...d.box, x, y } }));
		}
	};

	const onPointerUp = () => {
		if (!drag) return;
		const prev = boxes[drag.key];
		if (drag.box.x !== prev.x || drag.box.y !== prev.y) commit(drag.key, drag.box);
		setDrag(null);
	};

	// ---- keyboard: arrows nudge, R rotates, Esc deselects ----

	const onKeyDown = (e) => {
		if (!selected) return;
		if (e.key === "Escape") return setSelected(null);
		if (e.key.toLowerCase() === "r") {
			e.preventDefault();
			return rotate(selected);
		}
		const step = {
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
		}[e.key];
		if (!step) return;
		e.preventDefault();
		const b = layout[selected];
		if (!b) return flash("Drag it onto the floor first.");
		commit(selected, { ...b, x: b.x + step[0], y: b.y + step[1] });
	};

	// ---- save (whole map in one request; the server replaces the rows in a transaction) ----

	const handleSave = async () => {
		setSaving(true);
		try {
			const response = await fetch(
				route("rack.floor-map.update", { productionLine: rackPage.key }),
				{
					method: "PUT",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						"X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content,
					},
					body: JSON.stringify({
						width: floor.width,
						height: floor.height,
						blocks: blocksFromLayout(layout),
					}),
				},
			);
			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				const firstError = data?.errors ? Object.values(data.errors).flat()[0] : null;
				toast.error(firstError || data?.message || "Could not save the floor map.");
				return;
			}

			// The server's copy is the source of truth.
			const next = toState(blocks, data.data);
			setLayout(next.layout);
			setFloor(next.floor);
			setSaved(next);
			toast.success(data?.message || "Floor map saved.");
		} catch (error) {
			console.error(error);
			toast.error("Network error. The floor map was not saved.");
		} finally {
			setSaving(false);
		}
	};

	const handleReset = () => {
		setLayout(saved.layout);
		setFloor(saved.floor);
		setSelected(null);
		setDrag(null);
	};

	const extent = useMemo(
		() => ({
			w: Math.max(1, ...Object.values(layout).map((b) => b.x + b.w)),
			h: Math.max(1, ...Object.values(layout).map((b) => b.y + b.h)),
		}),
		[layout],
	);

	const dragValid = drag ? isValid(drag.key, drag.box) : true;
	const sel = selected ? boxes[selected] : null;

	return (
		<div className="flex h-full w-full flex-col gap-3 overflow-auto p-4 font-sans text-base-content">
			<header className="flex flex-wrap items-center gap-x-4 gap-y-2">
				<h1 className="text-xl font-black uppercase tracking-tight">
					Rack Layout Editor
					{rackPage?.key && <span className="ml-2 text-base-content/60">{rackPage.key}</span>}
				</h1>

				<label className="flex items-center gap-1 text-sm">
					Floor
					<input
						type="number"
						className="input input-bordered input-sm w-16"
						min={extent.w}
						max={MAX_FLOOR}
						value={floor.width}
						onChange={(e) =>
							setFloor((f) => ({ ...f, width: clamp(Number(e.target.value) || extent.w, extent.w, MAX_FLOOR) }))
						}
					/>
					×
					<input
						type="number"
						className="input input-bordered input-sm w-16"
						min={extent.h}
						max={MAX_FLOOR}
						value={floor.height}
						onChange={(e) =>
							setFloor((f) => ({ ...f, height: clamp(Number(e.target.value) || extent.h, extent.h, MAX_FLOOR) }))
						}
					/>
					<span className="text-xs text-base-content/60">cells</span>
				</label>

				<div className="ml-auto flex items-center gap-2">
					{dirty && <span className="text-sm text-warning">Unsaved changes</span>}
					{unplacedCount > 0 && (
						<button type="button" className="btn btn-sm btn-ghost" onClick={applyStarter}>
							Load starter layout
						</button>
					)}
					<button type="button" className="btn btn-sm btn-ghost" disabled={!dirty || saving} onClick={handleReset}>
						Reset
					</button>
					<button type="button" className="btn btn-sm btn-primary" disabled={!dirty || saving} onClick={handleSave}>
						{saving ? "Saving…" : "Save"}
					</button>
				</div>
			</header>

			<div className="flex min-h-8 flex-wrap items-center gap-2 text-sm">
				<span className="text-base-content/70">
					Placed {blocks.length - unplacedCount}/{blocks.length}
				</span>
				{sel && byKey[selected] && (
					<>
						<span className="font-bold">
							Selected {byKey[selected].label}
							{sel.placed && (
								<span className="ml-1 font-mono text-xs font-normal text-base-content/60">
									x{sel.x} y{sel.y} {sel.w}×{sel.h}
								</span>
							)}
						</span>
						<button type="button" className="btn btn-xs" onClick={() => rotate(selected)}>
							Rotate (R)
						</button>
						{sel.placed && (
							<span className="flex items-center gap-1 text-xs">
								W
								<input
									type="number"
									className="input input-bordered input-xs w-14"
									min={1}
									max={MAX_BLOCK}
									value={sel.w}
									onChange={(e) => resize(selected, { w: clamp(Number(e.target.value) || 1, 1, MAX_BLOCK) })}
								/>
								H
								<input
									type="number"
									className="input input-bordered input-xs w-14"
									min={1}
									max={MAX_BLOCK}
									value={sel.h}
									onChange={(e) => resize(selected, { h: clamp(Number(e.target.value) || 1, 1, MAX_BLOCK) })}
								/>
							</span>
						)}
						{sel.placed && (
							<button type="button" className="btn btn-xs" onClick={() => unplace(selected)}>
								Unplace
							</button>
						)}
					</>
				)}
				{message && <span className="text-warning">{message}</span>}
			</div>

			<p className="text-xs text-base-content/60">
				Drag a block to move it (snaps to cells). With a block selected: arrow keys nudge, R rotates, the W/H
				boxes resize it, Esc deselects. Dashed blocks under the floor are not placed yet; drag them onto it. Nothing is stored
				until you press Save.
			</p>

			{blocks.length === 0 && (
				<div className="rounded-lg border border-dashed border-base-300 p-6 text-sm text-base-content/70">
					This rack page has no shelves yet, so there is nothing to place.
				</div>
			)}

			<div className="rounded-lg border border-base-300 bg-base-200/40 p-4">
				<div
					ref={canvasRef}
					tabIndex={0}
					onKeyDown={onKeyDown}
					className="relative mx-auto w-full outline-none"
					style={{
						aspectRatio: `${floor.width} / ${rows}`,
						// optional: also fit the screen height (adjust 16rem to your header/toolbar height)
						maxWidth: `calc((100vh - 16rem) * ${floor.width / rows})`,
					}}
				>
					{/* floor with a cell grid; percentage sizes keep exactly floor.width x floor.height cells */}
					<div
						className="absolute left-0 top-0 rounded border border-base-content/30 bg-base-100/40"
						style={{
							width: "100%",
							height: `${(floor.height / rows) * 100}%`,
							backgroundImage:
								"linear-gradient(to right, rgba(128,128,128,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.22) 1px, transparent 1px)",
							backgroundSize: `${100 / floor.width}% ${100 / floor.height}%`,
						}}
					/>

					{unplacedCount > 0 && (
						<div
							className="absolute text-[10px] text-warning"
							style={{ left: 0, top: `${((floor.height + 0.4) / rows) * 100}%` }}
						>
							Not placed yet
						</div>
					)}

					{blocks.map((blk) => {
						const isDragging = drag?.key === blk.key;
						const b = isDragging ? drag.box : boxes[blk.key];
						const placed = boxes[blk.key].placed;
						const vertical = b.h > b.w;

						return (
							<div
								key={blk.key}
								title={`${blk.rackLabel} · Shelf ${blk.label}`}
								onPointerDown={(e) => onPointerDown(e, blk.key)}
								onPointerMove={onPointerMove}
								onPointerUp={onPointerUp}
								onPointerCancel={() => setDrag(null)}
								className={clsx(
									"absolute flex touch-none select-none overflow-hidden rounded-md border-2 bg-base-100",
									vertical && "flex-col",
									isDragging ? "z-30 cursor-grabbing shadow-xl" : "z-10 cursor-grab",
									selected === blk.key ? "border-primary" : "border-base-content/40",
									!placed && !isDragging && "border-dashed opacity-80",
									isDragging && !dragValid && "!border-error bg-error/20",
								)}
								style={{
									left: `${(b.x / floor.width) * 100}%`,
									top: `${(b.y / rows) * 100}%`,
									width: `${(b.w / floor.width) * 100}%`,
									height: `${(b.h / rows) * 100}%`,
									containerType: "size", // lets the label scale with the block
								}}
							>
								{Array.from({ length: blk.count }, (_, i) => (
									<span
										key={i}
										className={clsx(
											"flex-1 border-base-content/20",
											vertical ? "w-full border-b last:border-b-0" : "h-full border-r last:border-r-0",
										)}
									/>
								))}
								<span className="pointer-events-none absolute inset-0 flex items-center justify-center">
									<span
										className="rounded bg-base-100/90 px-1 font-black leading-tight"
										style={{ fontSize: "clamp(8px, 40cqmin, 24px)" }}
									>
										{blk.label}
									</span>
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}