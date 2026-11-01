import CancellableActionButton from "@/Components/CancellableActionButton";
import { Draggable } from "@/Components/DnD/Draggable";
import { Droppable } from "@/Components/DnD/Droppable";
import { MachineDraggable } from "@/Components/DnD/MachineDraggable";
import MultiSelectSearchableDropdown from "@/Components/MultiSelectSearchableDropdown";
import Tabs from "@/Components/Tabs";
import { useMutation } from "@/Hooks/useMutation";
import { createUndoStore } from "@/Store/undoStore";
import generateDistinctColors from "@/Utils/generateDistinctColors";
import getReadableTextColor from "@/Utils/getReadableTextColorBasedBG";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { router, usePage } from "@inertiajs/react";
import clsx from "clsx";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaRedo, FaUndo } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import { Tooltip } from "react-tooltip";

function closenessRatio(value, minReference, maxReference, maxDistance = 50) {
	if (value >= minReference && value <= maxReference) {
		return 1;
	}

	const distance =
		value < minReference ? minReference - value : value - maxReference;

	if (distance >= maxDistance) return 0;
	return 1 - distance / maxDistance;
}

function lerp(a, b, t) {
	return Math.round(a + (b - a) * t);
}

const factoryDroppables = {
	f1: { name: "F1", color: "var(--color-f1color)" },
	f2: { name: "F2", color: "var(--color-f2color)" },
	f38mm: { name: "F3 8mm", color: "var(--color-f3color)" },
	f312mm: { name: "F3 12mm", color: "var(--color-f3color)" },
};

const bodySizePages = {
	"Body Sizes' Capacity": route("package.body_size.capacity.index"),
	"Body Sizes": route("package.body_size.capacity.body-sizes"),
	Machines: route("package.body_size.capacity.machines"),
};

const UNASSIGNED = "unassigned";

const useUndoStore = createUndoStore({ draggables: new Map(), locations: {} });

function assignColorsByName(names) {
  const nameCounts = {};
  for (const name of names) {
    nameCounts[name] = (nameCounts[name] ?? 0) + 1;
  }

  const duplicatedNames = Object.keys(nameCounts).filter((n) => nameCounts[n] >= 1);
  const colors = generateDistinctColors(duplicatedNames.length);

  const nameColorMap = {};
  duplicatedNames.forEach((name, i) => {
    nameColorMap[name] = colors[i];
  });

  return nameColorMap;
}

function PackageBodySizeCapacityList() {
	const [hoveredDroppable, setHoveredDroppable] = useState(null);

	const { bodySizes, machines } = usePage().props;

	const containers = React.useMemo(
		() => new Map(bodySizes.map((item) => [item.key, item.value])),
		[bodySizes],
	);

	const initializeState = useCallback(() => {
		const machineDraggables = new Map();
		const initialLocations = {};

		const colorsMap = assignColorsByName(machines.flatMap((m) => m.capacity_profiles.map(() => m.name)));

		machines?.forEach((machine) => {
			const capacityProfiles = machine?.capacity_profiles ?? [];
			const machineId = machine.id;

			if (capacityProfiles.length === 0) {
				const id = `machine-${machineId}`;

				machineDraggables.set(id, {
					id,
					machineId,
					profileId: null,
					name: machine?.name ?? null,
					color: colorsMap[machine.name],
					value: 0,
					bodySizeName: null,
					factory: null,
				});

				initialLocations[id] = null;
				return;
			}

			capacityProfiles.forEach((profile) => {
				const profileId = profile.id;
				const factory = profile?.factory ?? null;
				const id = `machine-${machineId}-${profileId}`;

				machineDraggables.set(id, {
					id,
					machineId,
					profileId,
					name: machine?.name ?? null,
					color: colorsMap[machine.name],
					value: Number(profile?.capacity) || 0,
					bodySizeName: profile?.body_size?.name ?? null,
					factory: typeof factory === "string" ? factory.toLowerCase() : null,
				});

				initialLocations[id] =
					profile?.body_size?.name && factory
						? `${profile.body_size.name}-${factory}`
						: null;
			});
  });

  return {
    draggables: machineDraggables,
    locations: initialLocations,
  };
}, [machines]);

	const { 
		reset, 
		present, 
		past,
		future,
		update, 
		undo,
		redo,
	} = useUndoStore();
	const initialState = initializeState();

	const canUndo = useUndoStore(state => state.past.length > 0);
	const canRedo = useUndoStore(state => state.future.length > 0);

	useEffect(() => {
    if (machines?.length) {
      reset(initialState);
    }
  }, [machines]);

	
	const draggables = present.draggables;
	const locations = present.locations;

	const machineNameCount = React.useMemo(() => {
		const counts = new Map();

		for (const [, item] of draggables) {
			counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
		}

		return counts;
	}, [draggables]);
	
	const handleReset = () => {
		const {draggables: newDraggables} = initializeState();

		const nextLocations = {};
		for (const [id, item] of newDraggables) {
			const { bodySizeName, factory } = item;
			nextLocations[id] =
				bodySizeName && factory ? `${bodySizeName}-${factory}` : null;
		}
		update((prev) => {
			return {
				...prev,
				draggables: newDraggables,
				locations: nextLocations,
			};
		})
	};

	const targetMin = 0;
	const target = 100;

	const [activeDraggableID, setActiveDraggableID] = useState(null);

	const [bodySizeVisibility, setBodySizeVisibility] = useState(() =>
		Object.fromEntries([...containers.keys()].map((id) => [id, true])),
	);

	const selectedBodySizeVisibility = Object.keys(bodySizeVisibility).filter(
		(key) => bodySizeVisibility[key],
	);

	const bodySizeOptions = [...containers.keys()].map((container) => {
		return {
			value: container,
		};
	});

	const handleBodySizeVisibilityChange = (selected) => {
		const newVisibility = {};
		containers.forEach((value, bodySizeId) => {
			if (bodySizeId) {
				newVisibility[bodySizeId] = selected.includes(bodySizeId);
			}
		});
		setBodySizeVisibility(newVisibility);
	};

	useEffect(() => {
		setBodySizeVisibility(
			Object.fromEntries([...containers.keys()].map((id) => [id, true])),
		);
	}, [containers]);

	const activeDraggableObject = activeDraggableID
		? draggables.get(activeDraggableID)
		: null;

	function handleDragStart(event) {
		setActiveDraggableID(event.active.id);
	}

	function handleDragEnd({
		event,
		draggableId,
		bodySizeName,
		factoryId,
		overId,
	}) {
		let activeId = draggableId || null;
		let newBodySizeName = bodySizeName || null;
		let newFactory = factoryId || null;
		let targetId = overId || null;

		if (event) {
            if (!event.over) {
                setActiveDraggableID(null);
                return;
            }

			activeId = event.active?.id || null;
			targetId = event.over?.id || null;
			newBodySizeName = event.over
				? event.over.data.current.bodySizeName
				: null;
			newFactory = event.over ? event.over.data.current.factoryId : null;
		}

		if (!activeId) return;

		update((prev) => {
			const item = prev.draggables.get(activeId);
			if (!item) return prev;

			const newDraggables = new Map(prev.draggables);
			const updatedItem = { ...item, bodySizeName: newBodySizeName, factory: newFactory };
			newDraggables.set(activeId, updatedItem);

			const newLocations = { ...prev.locations, [activeId]: targetId === UNASSIGNED ? null : targetId };

			return {
				draggables: newDraggables,
				locations: newLocations,
			};
		});
		
		setActiveDraggableID(null);
	}

	const updateDraggable = useCallback((id, key, newValue) => {
		update((prev) => {
			const item = prev.draggables.get(id);
			if (!item) return prev;

			const nextDraggables = new Map(prev.draggables);
			nextDraggables.set(id, {
				...item,
				[key]: key === "value" ? parseInt(newValue) || 0 : newValue,
			});

			return {
				...prev,
				draggables: nextDraggables,
			};
		});
	}, []);

	const duplicateDraggable = useCallback((original) => {
		const newId = `${original.id}-${Date.now()}`;
		const combinedId = `${original.bodySizeName}-${original.factory}`;

		update((prev) => {
			const originalItem = prev.draggables.get(original.id);
			if (!originalItem) return prev;

			const nextDraggables = new Map(prev.draggables);
			nextDraggables.set(newId, { ...originalItem, id: newId, isDuplicate: true });
			
			const nextLocations = {
				...prev.locations,
				[newId]: combinedId,
			};

			return {
				draggables: nextDraggables,
				locations: nextLocations,
			};
		});
	}, []);

	const unassignDraggable = useCallback((draggable) => {
		const id = draggable.id;

		update((prev) => {
			const item = prev.draggables.get(id);
			if (!item) return prev;

			const nextDraggables = new Map(prev.draggables);
			nextDraggables.set(id, { ...item, bodySizeName: null, factory: null });

			const nextLocations = { ...prev.locations, [id]: null };

			return {
				draggables: nextDraggables,
				locations: nextLocations,
			};
		});
	}, []);

	const totalHiddenBodySize = Array.from(containers.entries()).reduce(
		(count, [bodySizeId]) => count + (!bodySizeVisibility[bodySizeId] ? 1 : 0),
		0,
	);

	const getDraggablesInOuter = (outerId) => {
		const innerIds = Object.keys(factoryDroppables).map(
			(inner) => `${outerId}-${inner}`,
		);
		return Array.from(draggables.values()).filter((d) =>
			innerIds.includes(locations[d.id]),
		);
	};

	const unassignedCount = Array.from(draggables.values()).filter(
		(d) => locations[d.id] === null,
	).length;

	const [selectedPage, setSelectedPage] = useState("Body Sizes' Capacity");

	const handleSelectPage = (name) => {
		setSelectedPage(name);

		router.visit(bodySizePages[name]);
	};

	const {
		mutate: mutateBodySizeCapacity,
		isLoading: isMutateBodySizeCapacityLoading,
		errorMessage: mutateBodySizeCapacityErrorMessage,
		errorData: mutateBodySizeCapacityErrorData,
		cancel: mutateBodySizeCapacityCancel,
	} = useMutation(route("api.body-sizes.bulkUpdate"));

	const handleSave = async () => {
		const { draggables: currentMachines} = initializeState();

		const isTheSame = (oldItem, newItem) => {
			if (!oldItem) return false;

			return (
				newItem.bodySizeName === oldItem.bodySizeName &&
				newItem.factory === oldItem.factory &&
				newItem.machineId === oldItem.machineId &&
				newItem.value === oldItem.value
			);
		};

		const updatedCapacity = [];
		const expiredProfiles = [];
		Array.from(draggables.values()).forEach((updatedMachine) => {
			const oldMachine = currentMachines.get(updatedMachine.id);
			const isNewMachine = !oldMachine;

			const isUnchanged = isTheSame(oldMachine, updatedMachine);
			if (isUnchanged) return;

			const isUnassigned =
				oldMachine?.bodySizeName !== null &&
				updatedMachine.bodySizeName === null;

			if (updatedMachine.profileId !== null && !isNewMachine) {
				expiredProfiles.push(updatedMachine.profileId);
			}

			if (isUnassigned) return;

			const bodySize = containers.get(updatedMachine.bodySizeName) ?? null;

			updatedCapacity.push({
				body_size_id: bodySize.id,
				factory: updatedMachine.factory,
				capacity: updatedMachine.value,
				machine_id: updatedMachine.machineId,
			});
		});

		try {
			await mutateBodySizeCapacity(
				route("api.body-sizes.capacity.bulkUpsert"),
				{
					method: "PATCH",
					body: {
						rows: updatedCapacity,
						expire_profiles: expiredProfiles,
					},
				},
			);

			toast.success("Capacity updated successfully");
		} catch (error) {
			console.error(error);
			toast.error(error.message);
		}
	};

	return (
		<div className="relative">
			<Tabs
				options={Object.keys(bodySizePages)}
				selectedFactory={selectedPage}
				handleFactoryChange={handleSelectPage}
				tabClassName={"mb-2"}
			/>
			{/* Header */}
			<div className="p-2 flex justify-between bg-base-200 shadow-lg items-center">
				<MultiSelectSearchableDropdown
					formFieldName="name"
					options={bodySizeOptions}
					defaultSelectedOptions={selectedBodySizeVisibility}
					onChange={handleBodySizeVisibilityChange}
					itemName="body size"
					prompt="Select body sizes to show"
					disableSearch
					contentClassName={"h-72"}
				/>
				{totalHiddenBodySize > 0 && (
					<div>{totalHiddenBodySize} body sizes hidden</div>
				)}
				<a href={null} className="unassigend-machine-droppable-tooltip btn">
					{unassignedCount} Unassigned machine/s
				</a>
				<div className="flex gap-2">
					<button
						type="button"
						className="btn btn-secondary disabled:opacity-50"
						onClick={() => undo()}
						disabled={!canUndo}
					>
						<FaUndo />
					</button>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => handleReset()}
					>
						Reset
					</button>
					<button
						type="button"
						className="btn btn-secondary disabled:opacity-50"
						onClick={() => redo()}
						disabled={!canRedo}
					>
						<FaRedo />
					</button>

					<CancellableActionButton
						abort={mutateBodySizeCapacityCancel}
						refetch={handleSave}
						loading={isMutateBodySizeCapacityLoading}
						buttonText={"Save for Today"}
						loadingMessage="Saving"
					/>
				</div>
			</div>

			<div
				className="sticky top-10 grid overflow-auto pr-3"
				style={{
					gridTemplateColumns: `50px repeat(${Object.keys(factoryDroppables).length}, minmax(0, 1fr))`,
				}}
			>
				<div className="font-bold border-b">Body Size</div>

				{Object.entries(factoryDroppables).map(([factoryId, factoryData]) => (
					<div
						key={factoryId}
						className="font-extrabold border-b text-left content-end"
						style={{ color: factoryData.color }}
					>
						{factoryData.name}
					</div>
				))}
			</div>

			<DndContext
				onDragStart={handleDragStart}
				onDragEnd={(event) => handleDragEnd({ event })}
			>
				<div
					className="grid overflow-auto h-[calc(100vh-260px)] pb-10"
					style={{
						gridTemplateColumns: `50px repeat(${Object.keys(factoryDroppables).length}, minmax(0, 1fr))`,
					}}
				>
					{/* Rows per outerId */}
					{Array.from(containers.entries()).map(
						([bodySizeNameId, bodySizeData]) => {
							if (!bodySizeVisibility[bodySizeNameId]) return null;

							const draggablesInOuter = getDraggablesInOuter(bodySizeNameId);
							const wip = bodySizeData.wip;
							const lot = bodySizeData.lot;

							return (
								<React.Fragment key={bodySizeNameId}>
									<div className="relative grid grid-cols-[50px_repeat(auto-fit,minmax(0,1fr))] border-b border-base-content/20 flex-0 items-center font-medium">
										<div className="sticky top-0">{bodySizeNameId}</div>
									</div>

									{Object.entries(factoryDroppables).map(
										([factoryId, factoryData]) => {
											const combinedId = `${bodySizeNameId}-${factoryId}`;
											const totalWip = wip[factoryId] || 0;
											const totalLot = lot[factoryId] || 0;

											const innerDraggables = Array.from(
												draggables.values(),
											).filter((d) => locations[d.id] === combinedId);

											const totalInnerValue = innerDraggables.reduce(
												(sum, d) => sum + d.value,
												0,
											);

											const potentialCapacityAddedActiveDraggable =
												totalInnerValue +
												(activeDraggableObject
													? activeDraggableObject.value *
														(locations[activeDraggableID] === combinedId
															? -1
															: 1)
													: 0);

											const utilPercentage =
												totalInnerValue > 0
													? (totalWip / totalInnerValue) * 100
													: 0;

											const potentialUtilPercentage =
												potentialCapacityAddedActiveDraggable > 0
													? (totalWip / potentialCapacityAddedActiveDraggable) *
														100
													: 0;

											const ratio = closenessRatio(
												potentialUtilPercentage,
												targetMin,
												target,
												1,
											);

											const alpha = 0.2; // 0 = transparent, 1 = solid
											const defaultColor = [255, 0, 0];
											const green = [0, 255, 0];
											const textColor = {
												backgroundColor: `rgb(
                    ${lerp(defaultColor[0], green[0], ratio)},
                    ${lerp(defaultColor[1], green[1], ratio)},
                    ${lerp(defaultColor[2], green[2], ratio)},
										${alpha}
                  )`,
											};

											const isEmpty =
												!activeDraggableID && innerDraggables.length === 0;

											const hovered =
												hoveredDroppable?.id === combinedId &&
												!activeDraggableID;

											return (
												<Droppable
													key={combinedId}
													id={combinedId}
													data={{
														color: factoryData.color,
														bodySizeName: bodySizeData.name,
														factoryId: factoryId,
													}}
												>
													<div
														role="button"
														className={clsx(
															"group relative py-1 border-b border-b-base-content/20 border-l flex flex-col w-full h-full",
															{
																"bg-red-500/10": ratio === 0,
																"ring ring-accent": hovered,
															},
														)}
														style={{
															borderLeftColor: factoryData.color,
															...(isEmpty ? {} : textColor),
														}}
														onMouseEnter={() =>
															setHoveredDroppable({
																id: combinedId,
																bodySizeName: bodySizeData.name,
																factoryId: factoryId,
															})
														}
													>
														<a
															href={null}
															className={clsx(
																"machine-pick-tooltip absolute top-0 -left-8 cursor-default btn btn-primary text-white rounded px-2 py-1 transition-all duration-200 ease-out",
																hovered
																	? "opacity-100 translate-x-0 pointer-events-auto"
																	: "opacity-0 -translate-x-2 pointer-events-none",
															)}
														>
															<FaPlus />
														</a>

														<div
															className={clsx(
																"flex justify-between mb-1 px-2 text-xs",
																{
																	"opacity-75": isEmpty,
																},
															)}
														>
															<div className="text-md items-start flex flex-col justify-start font-extrabold">
																<div
																	className={clsx("flex-1 text-base-content", {
																		"opacity-25": isEmpty,
																	})}
																>
																	{isEmpty
																		? "-"
																		: `${potentialUtilPercentage.toLocaleString(
																				"en-US",
																				{
																					minimumFractionDigits: 2,
																					maximumFractionDigits: 2,
																				},
																			)}%`}
																</div>
																<div
																	className={clsx(
																		"flex-1 line-through text-xs mr-1",
																		{
																			"opacity-0": !activeDraggableID,
																		},
																	)}
																>
																	{utilPercentage.toLocaleString("en-US", {
																		minimumFractionDigits: 2,
																		maximumFractionDigits: 2,
																	})}
																</div>
															</div>

															<div className="pl-1 flex w-40 flex-col">
																<div className="flex justify-end">
																	<span
																		className="opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 
               																transition-all duration-200 ease-in-out pr-2"
																	>
																		WIP
																	</span>
																	<span className="font-mono">
																		{totalWip.toLocaleString()}
																	</span>
																</div>
																<div className="flex justify-end">
																	<span
																		className="opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 
               																transition-all duration-200 ease-in-out pr-2"
																	>
																		CAP
																	</span>
																	<span className="font-mono">
																		{potentialCapacityAddedActiveDraggable.toLocaleString()}
																	</span>
																</div>
																<div className="flex justify-end">
																	<span
																		className="opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 
               																transition-all duration-200 ease-in-out pr-2"
																	>
																		LOT
																	</span>
																	<span className="font-mono">{totalLot}</span>
																</div>
															</div>
														</div>

														<div className="flex flex-col">
															{innerDraggables.length > 0
																? innerDraggables.map((d) => {
																	const hasDuplicate = (machineNameCount.get(d.name) ?? 0) > 1;

																	return (
																		<Draggable
																			key={d.id}
																			id={d.id}
																			data={{
																				draggable: d,
																				bodySizeName: bodySizeNameId,
																			}}
																			containerClassName={clsx(
																				"h-7 w-full border border-base-content/20",
																				{
																					"opacity-0": activeDraggableID === d.id,
																					"border-pink-500": d?.isDuplicate,
																					"bg-base-100": !hasDuplicate,
																				},
																			)}
																			style={{
																				backgroundColor: (hasDuplicate && d.color) ?? undefined,
																				color: (hasDuplicate && d.color) ? getReadableTextColor(d.color) : undefined,
																			}}
																		>
																			<div className="relative h-full">
																					<MachineDraggable
																						d={d}
																						updateDraggable={updateDraggable}
																						dupeFunction={duplicateDraggable}
																						unassignFunction={unassignDraggable}
																					/>
																			</div>
																		</Draggable>

																	)
																	})
																: null}
														</div>
													</div>
												</Droppable>
											);
										},
									)}
								</React.Fragment>
							);
						},
					)}
				</div>

				<DragOverlay
					adjustScale={false}
					transition="transform 150ms cubic-bezier(0.2, 0, 0, 1)"
				>
					{activeDraggableID ? (() => {
							const active = draggables.get(activeDraggableID);
							const hasDuplicate = (machineNameCount.get(active.name) ?? 0) > 1;

							return (
									<div
											className={clsx("h-8 w-full ring-2 rounded-lg ring-accent", 
												{
													"bg-base-100": !hasDuplicate,
												}
											)}
											style={{
													backgroundColor: (hasDuplicate && active.color) ?? undefined,
													color: (hasDuplicate && active.color) ? getReadableTextColor(active.color) : undefined,
											}}
									>
											<MachineDraggable
													d={active}
													updateDraggable={updateDraggable}
													isOverlay
											/>
									</div>
							);
					})() : null}
				</DragOverlay>

				<Tooltip
					style={{ borderRadius: "8px", padding: "4px" }}
					anchorSelect={`.unassigend-machine-droppable-tooltip`}
					clickable
					offset={2}
				>
					<Droppable
						id={UNASSIGNED}
						data={{
							className: "mt-4 z-40 flex flex-1",
							bodySizeName: null,
							factoryId: null,
						}}
					>
						<div
							className="w-50 min-h-20 flex-1 p-2  overflow-y-auto"
							style={{ maxHeight: "200px" }}
						>
							<div className="flex gap-1 flex-wrap">
								{Array.from(draggables.values())
									.filter((d) => locations[d.id] === null)
									.map((d) => (
										<Draggable
											key={d.id}
											id={d.id}
											data={{ draggable: d, bodySizeName: UNASSIGNED }}
											containerClassName={clsx(
												"w-40 h-8 border-base-content/20",
												{ "opacity-0": activeDraggableID === d.id }
											)}
										>
											<MachineDraggable
												d={d}
												updateDraggable={updateDraggable}
											/>
										</Draggable>
									))}
							</div>
						</div>
					</Droppable>
				</Tooltip>
			</DndContext>

			<Tooltip
				style={{ borderRadius: "8px", padding: "4px" }}
				anchorSelect={`.machine-pick-tooltip`}
				clickable
				offset={2}
			>
				<div className="p-1 text-center">
					assign to {hoveredDroppable?.bodySizeName} -
					{factoryDroppables[hoveredDroppable?.factoryId]?.name}
					{!unassignedCount && "(0 left)"}
				</div>
				<div
					className="flex w-50 flex-col gap-px overflow-y-auto"
					style={{ maxHeight: "200px" }}
				>
					{Array.from(draggables.values())
						.filter((d) => locations[d.id] === null)
						.map((d) => (
							<button
								type="button"
								key={d.id}
								className="btn btn-ghost border-b border-b-white/20 btn-sm rounded-sm px-1"
								onClick={() => {
									handleDragEnd({
										draggableId: d.id,
										bodySizeName: hoveredDroppable?.bodySizeName,
										factoryId: hoveredDroppable?.factoryId,
										overId: hoveredDroppable?.id,
									});
								}}
							>
								<div className="flex w-full justify-between">
									<div>{d.name}</div>
									<div className="text-xs font-light">{d.value}</div>
								</div>
							</button>
						))}
				</div>
			</Tooltip>
		</div>
	);
}

export default PackageBodySizeCapacityList;
