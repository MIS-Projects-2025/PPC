import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";

const sanitizeFieldValue = (value) => {
	return value.replace(/\([^)]*\)/g, "").trim();
};

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

	if (normalized.startsWith(LOT_UPSTREAM_MODES.PREFIX_FIELS_SELECTOR)) {
		const field = normalized.split(":")[1]?.toLowerCase();
		if (LOT_UPSTREAM_MODES.FIELD_ORDER.includes(field)) {
			return { type: LOT_UPSTREAM_MODES.TYPE_FIELD_SELECT, field };
		}
	}

	if (input.includes(";")) {
		const parts = input.split(";");
		if (parts.length >= 4) {
			return {
				type: LOT_UPSTREAM_MODES.TYPE_LOT,
				lot_id: sanitizeFieldValue(parts[0]),
				partname: sanitizeFieldValue(parts[1]),
				qty: sanitizeFieldValue(parts[3]),
			};
		}
	}

	if (input.includes("|")) {
		const parts = input.split("|");
		if (parts.length >= 3) {
			return {
				type: LOT_UPSTREAM_MODES.TYPE_LOT,
				lot_id: sanitizeFieldValue(parts[1]),
				partname: sanitizeFieldValue(parts[0]),
				qty: sanitizeFieldValue(parts[2]),
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
