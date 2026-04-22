import CancellableActionButton from "@/Components/CancellableActionButton";
import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import { router } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { BiChevronDown, BiChevronRight } from "react-icons/bi";

function colLabel(n) {
	// n is 0-indexed
	let label = "";
	n += 1; // convert to 1-indexed
	while (n > 0) {
		n--;
		label = String.fromCharCode(65 + (n % 26)) + label;
		n = Math.floor(n / 26);
	}
	return label;
}

function SlotGrid({ shelves }) {
	const entries = Object.entries(shelves);
	const slotCount = entries[0]?.[1]?.length ?? 0;

	return (
		<div className="overflow-x-auto">
			<div className="min-w-max">
				{/* Header row */}
				<div className="flex">
					{entries.map(([rowLabel]) => (
						<div
							key={rowLabel}
							className="w-10 text-center text-xs font-bold text-base-content/60"
						>
							{rowLabel}
						</div>
					))}
				</div>

				{/* Slot rows */}
				{Array.from({ length: slotCount }, (_, i) => (
					<div key={i} className="flex items-center">
						{entries.map(([rowLabel, rowSlots]) => {
							const slot = rowSlots[i];
							return (
								<div
									key={slot.id}
									className="w-10 text-center text-xs border border-base-300 rounded p-1"
								>
									{slot.label}
								</div>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}

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

	const [isEditing, setIsEditing] = useState(false);
	const [newName, setNewName] = useState(rack.label || rack.name);

	const { mutate: updateRack, isLoading: isUpdateLoading } = useMutation();

	const {
		mutate: deleteRack,
		isLoading: isDeleteRackLoading,
		errorMessage: deleteRackErrorMessage,
		errorData: deleteRackErrorData,
		cancel: deleteRackCancel,
	} = useMutation();

	async function handleRename() {
		if (!newName.trim() || newName === (rack.label || rack.name)) {
			setIsEditing(false);
			return;
		}

		try {
			await updateRack(route("rack.update", rack.id), {
				method: "PATCH",
				body: { label: newName.trim() },
			});
			toast.success("Rack renamed!");
			setIsEditing(false);
			router.reload();
		} catch (error) {
			toast.error(error.message);
		}
	}

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
				<div className="flex items-center gap-4 w-full">
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

					{rack.production_line && (
						<span className="ml-2 text-xs text-base-content">
							{rack.production_line.name}
						</span>
					)}

					{isEditing ? (
						<div className="flex items-center gap-2">
							<input
								autoFocus
								type="text"
								className="input input-sm input-bordered w-48"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleRename()}
							/>
							<button
								type="button"
								className="btn btn-sm btn-primary"
								onClick={handleRename}
								disabled={isUpdateLoading}
							>
								{isUpdateLoading ? "..." : "Save"}
							</button>
							<button
								type="button"
								className="btn btn-sm btn-ghost"
								onClick={() => {
									setIsEditing(false);
									setNewName(rack.label);
								}}
							>
								Cancel
							</button>
						</div>
					) : (
						<div className="group flex items-center gap-2">
							<button
								type="button"
								className="btn hover:text-primary cursor-pointer font-bold text-lg"
								onClick={() => setIsEditing(true)}
							>
								{rack.label || rack.name}
							</button>
							<button
								type="button"
								className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs"
								onClick={() => setIsEditing(true)}
							>
								Edit Name
							</button>
						</div>
					)}

					<div className="ml-auto flex gap-3 text-xs text-base-content">
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
						type="button"
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
		for (let r = 1; r <= appliedLayers; r++) {
			const row = [];
			for (let c = 0; c < appliedCols; c++) {
				const label = `${colLabel(c)}${r}`;

				row.push(label);
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
						Layers
					</label>
					<input
						type="number"
						min={1}
						value={layerCount}
						onChange={(e) => setLayerCount(parseInt(e.target.value))}
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
						value={colCount}
						onChange={(e) => setColCount(parseInt(e.target.value))}
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

			<div className="border border-base-content/50 rounded-lg bg-base-100 p-4 overflow-x-auto">
				<div className="flex mb-1">
					<div className="flex mb-2 gap-1 ml-9">
						{" "}
						{Array.from({ length: appliedCols }, (_, i) => (
							<div
								key={i}
								className="w-10 text-center text-xs font-bold opacity-50"
							>
								{colLabel(i)}
							</div>
						))}
					</div>
				</div>

				{slots.map((row, rowIndex) => (
					<div key={rowIndex} className="flex items-center gap-1 mb-1">
						<div className="w-8 flex-shrink-0 flex items-center justify-center font-bold text-sm bg-base-200 rounded">
							{rowIndex + 1}
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
