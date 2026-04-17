import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";
import clsx from "clsx";
import JsBarcode from "jsbarcode";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function SlotBarcode({ value, label, className = null }) {
	const ref = useRef();

	useEffect(() => {
		JsBarcode(ref.current, value, {
			format: "CODE128",
			width: 1,
			height: 50,
			displayValue: true,
			fontSize: 12,
			margin: 0,
			background: "transparent",
		});
	}, [value]);

	return (
		<div className={clsx("flex flex-col items-center rounded w-45", className)}>
			<svg ref={ref} />
			<span className="text-xs font-bold mt-1">{label}</span>
		</div>
	);
}

export default function RackBarcode({ racks }) {
	const [isExpanded, setIsExpanded] = useState(true);
	const slots = racks.flatMap((rack) =>
		Object.values(rack.shelves).flatMap((shelfSlots) => shelfSlots),
	);

	// useEffect(() => {
	// 	if (isExpanded) {
	// 		document.body.classList.add("print-mode-active");
	// 	} else {
	// 		document.body.classList.remove("print-mode-active");
	// 	}
	// }, [isExpanded]);

	if (!isExpanded)
		return (
			<button
				type="button"
				className="btn btn-primary"
				onClick={() => setIsExpanded(true)}
			>
				Expand to Print
			</button>
		);

	return createPortal(
		<div
			id="print-sheet"
			className="fixed inset-0 z-[9999] bg-white overflow-auto p-8"
		>
			<div className="flex justify-between items-center mb-6 print:hidden">
				<h1 className="text-xl font-bold">Print Preview</h1>
				<div className="flex gap-2">
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => window.print()}
					>
						Print Now
					</button>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => setIsExpanded(false)}
					>
						Close
					</button>
				</div>
			</div>

			{/* Control Barcode */}
			<div className="mb-8 print:break-inside-avoid">
				<h2 className="font-bold mb-3">Control</h2>
				<div className="flex justify-between">
					<SlotBarcode value="DONE" label="DONE" />
					<SlotBarcode value="CANCEL" label="CANCEL" />
					<SlotBarcode
						value={`FIELD:${LOT_UPSTREAM_MODES.LOTID}`}
						label={`FIELD:${LOT_UPSTREAM_MODES.LOTID}`}
					/>
					<SlotBarcode
						value={`FIELD:${LOT_UPSTREAM_MODES.PARTNAME}`}
						label={`FIELD:${LOT_UPSTREAM_MODES.PARTNAME}`}
					/>
					<SlotBarcode
						value={`FIELD:${LOT_UPSTREAM_MODES.QTY}`}
						label={`FIELD:${LOT_UPSTREAM_MODES.QTY}`}
					/>

					<SlotBarcode
						value="RECEIVING"
						label="RECEIVING MODE"
						className={"bg-lime-200"}
					/>
					<SlotBarcode
						value="RELEASING"
						label="RELEASING MODE"
						className={"bg-rose-300"}
					/>
				</div>
			</div>

			{/* Racks */}
			{racks.map((rack) => (
				<div
					key={rack.id}
					className="rack-group mb-8 print:break-before-page print:mb-0"
				>
					<h2 className="font-bold mb-3">{rack.label}</h2>
					<div className="flex flex-wrap gap-3">
						{Object.values(rack.shelves).flatMap((shelfSlots) =>
							shelfSlots.map((slot) => (
								<div
									key={slot.id}
									className="slot-card print:break-inside-avoid"
								>
									<SlotBarcode
										value={`${LOT_UPSTREAM_MODES.PREFIX_SLOT_MODE}${slot.id}`}
										label={slot.label}
									/>
								</div>
							)),
						)}
					</div>
				</div>
			))}
		</div>,
		document.body,
	);
}
