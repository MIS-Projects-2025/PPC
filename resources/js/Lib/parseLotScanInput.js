import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";

export function parseLotScanInput(input) {
	const normalized = input.trim().toUpperCase();

	if (normalized === LOT_UPSTREAM_MODES.DONE)
		return {
			type: LOT_UPSTREAM_MODES.TYPE_COMMAND,
			command: LOT_UPSTREAM_MODES.DONE,
		};
	if (normalized === LOT_UPSTREAM_MODES.RECEIVING)
		return {
			type: LOT_UPSTREAM_MODES.TYPE_COMMAND,
			command: LOT_UPSTREAM_MODES.RECEIVING,
		};
	if (normalized === LOT_UPSTREAM_MODES.RELEASING)
		return {
			type: LOT_UPSTREAM_MODES.TYPE_COMMAND,
			command: LOT_UPSTREAM_MODES.RELEASING,
		};

	// Field-select command barcodes (Option B)
	if (normalized.startsWith("FIELD:")) {
		const field = normalized.split(":")[1]?.toLowerCase();
		if (LOT_UPSTREAM_MODES.FIELD_ORDER.includes(field)) {
			return { type: LOT_UPSTREAM_MODES.TYPE_FIELD_SELECT, field };
		}
	}

	if (input.includes(";")) {
		const parts = input.split(";");
		if (parts.length >= 4) {
			return {
				type: "LOT",
				lot_id: parts[0].trim(),
				partname: parts[1].trim(),
				qty: parts[3].trim(),
			};
		}
	}

	if (input.includes("|")) {
		const parts = input.split("|");
		if (parts.length >= 3) {
			return {
				type: "LOT",
				lot_id: parts[1].trim(),
				partname: parts[0].trim(),
				qty: parts[2].trim(),
			};
		}
	}

	const SLOT_PREFIX = LOT_UPSTREAM_MODES.PREFIX_SLOT_MODE;
	if (normalized.startsWith(SLOT_PREFIX)) {
		const slotId = input.substring(SLOT_PREFIX.length).trim();
		return {
			type: LOT_UPSTREAM_MODES.TYPE_SLOT,
			slotId: slotId,
		};
	}

	if (input.includes("SLOT:")) {
		// Fallback for older formats if necessary
		return {
			type: LOT_UPSTREAM_MODES.TYPE_SLOT,
			slotId: input.split(":")[1].trim(),
		};
	}

	return { type: LOT_UPSTREAM_MODES.TYPE_FIELD_VALUE, value: input.trim() };
}
