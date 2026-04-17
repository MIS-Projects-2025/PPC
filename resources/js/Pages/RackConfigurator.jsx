import CancellableActionButton from "@/Components/CancellableActionButton";
import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import { router } from "@inertiajs/react";
import { useMemo, useState } from "react";
import {
	BiArrowToBottom,
	BiArrowToRight,
	BiChevronDown,
	BiChevronRight,
} from "react-icons/bi";
import { BsArrowDown, BsArrowRight } from "react-icons/bs";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function pad(n) {
	return String(n).padStart(2, "0");
}

function SlotGrid({ shelves }) {
	const letters = Object.keys(shelves).sort();
	const colCount = (shelves[letters[0]] ?? []).length;

	return (
		<div className="border border-base-content/50 rounded-lg bg-base-100 p-4 overflow-x-auto">
			<div className="flex gap-1 mb-1 pl-7">
				{Array.from({ length: colCount }, (_, i) => (
					<div
						key={i}
						className="w-10 text-center text-[10px] text-base-content font-mono flex-shrink-0"
					>
						{pad(i + 1)}
					</div>
				))}
			</div>

			{letters.map((letter) => (
				<div key={letter} className="flex items-center gap-1 mb-1">
					<div className="w-6 text-center text-xs font-mono font-medium text-base-content flex-shrink-0">
						{letter}
					</div>
					{shelves[letter].map((slot) => (
						<div
							key={slot.label}
							className={[
								"w-10 py-1 rounded text-[10px] font-mono flex-shrink-0 border text-center",
								slot.is_active
									? "bg-base-100 text-base-content border-base-content/50"
									: "bg-rose-500 text-base-content border-base-content/50 line-through",
							].join(" ")}
						>
							{slot.label}
						</div>
					))}
				</div>
			))}
		</div>
	);
}

// ─── Individual rack row ──────────────────────────────────────────────────────

function RackRow({ rack }) {
	const toast = useToast();
	const [expanded, setExpanded] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const letters = Object.keys(rack.shelves).sort();
	const totalSlots = letters.reduce(
		(acc, l) => acc + rack.shelves[l].length,
		0,
	);
	const activeSlots = letters.reduce(
		(acc, l) => acc + rack.shelves[l].filter((s) => s.is_active).length,
		0,
	);

	const {
		mutate: deleteRack,
		isLoading: isDeleteRackLoading,
		errorMessage: deleteRackErrorMessage,
		errorData: deleteRackErrorData,
		cancel: deleteRackCancel,
	} = useMutation();

	function handleDelete() {
		if (!confirmDelete) {
			setConfirmDelete(true);
			return;
		}

		try {
			deleteRack(route("rack.destroy", rack.id), {
				method: "DELETE",
			});

			toast.success("Rack deleted successfully!");
		} catch (error) {
			toast.error(error.message);
		}

		router.reload();
	}

	return (
		<div className="border border-base-content/50 rounded-lg overflow-hidden">
			<div className="flex items-center justify-between px-4 py-3 bg-base-100">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						className="btn text-base-content"
					>
						{expanded ? (
							<BiChevronDown className="w-4 h-4 text-base-content" />
						) : (
							<BiChevronRight className="w-4 h-4 text-base-content" />
						)}
					</button>

					<div>
						<span className="text-sm font-medium text-base-content">
							{rack.name}
						</span>
						{rack.production_line && (
							<span className="ml-2 text-xs text-base-content">
								{rack.production_line.name}
							</span>
						)}
					</div>

					<div className="flex gap-3 text-xs text-base-content">
						<span>{rack?.label ?? "-"}</span>
						<span>{letters.length} layers</span>
						<span>
							{activeSlots}/{totalSlots} active
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{confirmDelete && (
						<span className="text-xs text-red-500">Are you sure?</span>
					)}
					<button
						className="btn btn-ghost"
						onClick={() => setConfirmDelete(!confirmDelete)}
					>
						{confirmDelete ? "Cancel" : "delete"}
					</button>
					{confirmDelete && (
						<CancellableActionButton
							abort={deleteRackCancel}
							refetch={handleDelete}
							loading={isDeleteRackLoading}
							buttonText={"Confirm Delete"}
							loadingMessage="Deleting"
						/>
					)}
				</div>
			</div>

			{expanded && (
				<div className="px-4 pb-4 pt-4 bg-base-100 border-t border-gray-100">
					<SlotGrid shelves={rack.shelves} />
				</div>
			)}
		</div>
	);
}

export default function RackConfigurator({ racks, plines }) {
	console.log("🚀 ~ RackConfigurator ~ racks:", racks);
	const toast = useToast();

	const [rackName, setRackName] = useState("");
	const [layerCount, setLayerCount] = useState(4);
	const [colCount, setColCount] = useState(10);
	const [appliedLayers, setAppliedLayers] = useState(4);
	const [appliedCols, setAppliedCols] = useState(10);
	const [disabledSlots, setDisabledSlots] = useState(new Set());
	const [plID, setPlID] = useState(null);

	const slots = useMemo(() => {
		const rows = [];
		for (let l = 0; l < appliedLayers; l++) {
			const row = [];
			for (let c = 1; c <= appliedCols; c++) {
				row.push(`${LETTERS[l]}${pad(c)}`);
			}
			rows.push(row);
		}
		return rows;
	}, [appliedLayers, appliedCols]);

	const totalSlots = appliedLayers * appliedCols;
	const inactiveCount = disabledSlots.size;
	const activeCount = totalSlots - inactiveCount;

	function toggleSlot(slotId) {
		setDisabledSlots((prev) => {
			const next = new Set(prev);
			if (next.has(slotId)) next.delete(slotId);
			else next.add(slotId);
			return next;
		});
	}

	function applyDimensions() {
		setAppliedLayers(layerCount);
		setAppliedCols(colCount);
		setDisabledSlots(new Set());
	}

	const {
		mutate: mutateRack,
		isLoading: isMutateRackLoading,
		errorMessage: mutateRackErrorMessage,
		errorData: mutateRackErrorData,
		cancel: mutateRackCancel,
	} = useMutation();

	async function handleSave() {
		if (!rackName.trim()) return;

		try {
			const payload = {
				label: rackName.trim(),
				layers: appliedLayers,
				columns: appliedCols,
				production_line_id: plID,
				slots: slots.flat().map((label) => ({
					label,
					is_active: !disabledSlots.has(label),
				})),
			};

			await mutateRack(route("rack.store"), {
				method: "POST",
				body: payload,
			});

			toast.success("Rack created successfully!");
			setRackName("");
			setPlID(null);
			setLayerCount(4);
			setColCount(10);

			router.reload();
		} catch (error) {
			toast.error(error?.message);
		}
	}

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-6">
			{/* Form */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div className="md:col-span-2 flex flex-col gap-1">
					<label className="text-xs font-medium text-base-content uppercase tracking-wide">
						Rack Name
					</label>
					<input
						type="text"
						value={rackName}
						onChange={(e) => setRackName(e.target.value)}
						placeholder="e.g. TR-RACK-003"
						className="input"
					/>
				</div>

				<div className="md:col-span-2 flex flex-col gap-1">
					<label className="text-xs font-medium text-base-content uppercase tracking-wide">
						Production
					</label>
					<button
						type="button"
						className="btn"
						popoverTarget="popover-1"
						style={{ anchorName: "--anchor-1" }}
					>
						{plID ? plines.find((pline) => pline.id === plID).name : "Select"}
					</button>

					<ul
						className="dropdown menu w-52 rounded-box bg-base-100 shadow-sm"
						popover="auto"
						id="popover-1"
						style={{ positionAnchor: "--anchor-1" }}
					>
						{plines.map((pline) => (
							<li key={pline.id}>
								<a onClick={() => setPlID(pline.id)}>{pline.name}</a>
							</li>
						))}
					</ul>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-base-content uppercase tracking-wide">
						Layers (A–Z)
					</label>
					<input
						type="number"
						min={1}
						max={26}
						value={layerCount}
						onChange={(e) =>
							setLayerCount(
								Math.min(26, Math.max(1, parseInt(e.target.value) || 1)),
							)
						}
						className="input"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-xs font-medium text-base-content uppercase tracking-wide">
						Columns
					</label>
					<input
						type="number"
						min={1}
						max={99}
						value={colCount}
						onChange={(e) =>
							setColCount(
								Math.min(99, Math.max(1, parseInt(e.target.value) || 1)),
							)
						}
						className="input"
					/>
				</div>
			</div>

			<button
				type="button"
				onClick={applyDimensions}
				className="btn btn-secondary text-sm"
			>
				Apply Dimensions
			</button>

			{/* Grid */}
			<div className="border border-base-content/50 rounded-lg bg-base-100 p-4 overflow-x-auto">
				{/* Column headers */}
				<div className="flex gap-1 mb-1 pl-7">
					{Array.from({ length: appliedCols }, (_, i) => (
						<div
							key={i}
							className="w-10 text-center text-[10px] text-base-content font-mono flex-shrink-0"
						>
							{pad(i + 1)}
						</div>
					))}
				</div>

				{/* Rows */}
				{slots.map((row, li) => (
					<div key={li} className="flex items-center gap-1 mb-1">
						{/* Layer label */}
						<div className="w-6 text-center text-xs font-mono font-medium text-base-content flex-shrink-0">
							{LETTERS[li]}
						</div>

						{row.map((slotId) => {
							const inactive = disabledSlots.has(slotId);
							return (
								<button
									type="button"
									key={slotId}
									onClick={() => toggleSlot(slotId)}
									title={inactive ? "Mark as active" : "Mark as inactive"}
									className={[
										"w-10 py-1 rounded text-[10px] font-mono flex-shrink-0 border transition-colors",
										inactive
											? "bg-rose-500 text-neutral border-gray-200 line-through"
											: "bg-base-300 text-base-content border-gray-300 hover:border-blue-400 hover:text-blue-600",
									].join(" ")}
								>
									{slotId}
								</button>
							);
						})}
					</div>
				))}
			</div>

			{/* Stats */}
			<div className="flex items-center justify-between text-sm text-base-content">
				<div className="flex gap-4">
					<span>
						Total:{" "}
						<span className="font-medium text-base-content">{totalSlots}</span>
					</span>
					<span>
						Active:{" "}
						<span className="font-medium text-green-600">{activeCount}</span>
					</span>
					<span>
						Inactive:{" "}
						<span className="font-medium text-base-content">
							{inactiveCount}
						</span>
					</span>
				</div>

				<div className="flex gap-4 text-xs">
					<span className="flex items-center gap-1">
						<span className="w-3 h-3 rounded-sm border border-gray-300 bg-base-300 inline-block" />
						active
					</span>
					<span className="flex items-center gap-1">
						<span className="w-3 h-3 rounded-sm border border-gray-200 bg-rose-500 inline-block" />
						inactive
					</span>
				</div>
			</div>

			{inactiveCount > 0 && (
				<p className="text-xs text-warning-content bg-warning border border-amber-200 rounded px-3 py-2">
					Inactive slots will exist on the rack but cannot be assigned lots. To
					change the rack layout structurally, create a new rack instead.
				</p>
			)}

			{/* Save */}
			<div className="flex justify-end">
				<CancellableActionButton
					abort={mutateRackCancel}
					refetch={handleSave}
					loading={isMutateRackLoading}
					buttonText={"Create Rack"}
					loadingMessage="Creating rack..."
				/>
			</div>

			{racks.length > 0 && (
				<div className="pt-4 border-t border-gray-200 space-y-3">
					<h2 className="text-xs font-medium text-base-content uppercase tracking-wide">
						Existing racks
					</h2>
					{racks.map((rack) => (
						<RackRow key={rack.id} rack={rack} />
					))}
				</div>
			)}
		</div>
	);
}
