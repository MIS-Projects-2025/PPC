// Floor-map helpers + a STARTER layout.
//
// The real floor map now lives in the database (rack_floor_maps / rack_floor_blocks).
// STARTER_LAYOUT is only a template the editor can apply with "Load starter layout".
// Once your map is saved you can delete STARTER_* and the button.
//
// Coordinates are in grid cells. 1 cell = UNIT pixels. Origin (0,0) is top-left.
// w/h are the block footprint in cells (w: 2, h: 1 = horizontal, swap for vertical).

export const UNIT = 48;

// ---- DB <-> client shape ----
// The server stores one row per shelf: { rack_id, shelf_label, x, y, w, h }.
// The client keeps them as { "<rack_id>:<shelf_label>": { x, y, w, h } } for fast lookup.

export const blockKey = (rackId, shelfLabel) => `${rackId}:${shelfLabel}`;

export const layoutFromBlocks = (blocks = []) =>
	Object.fromEntries(
		blocks.map((b) => [
			blockKey(b.rack_id, b.shelf_label),
			{ x: b.x, y: b.y, w: b.w, h: b.h },
		]),
	);

export const blocksFromLayout = (layout) =>
	Object.entries(layout).map(([key, { x, y, w, h }]) => {
		const i = key.indexOf(":"); // rack ids are numeric, so the first ":" is the separator
		return { rack_id: Number(key.slice(0, i)), shelf_label: key.slice(i + 1), x, y, w, h };
	});

// ---- starter template (keyed by shelf letter only) ----

export const STARTER_FLOOR = { width: 28, height: 6 };

// Keyed by SHELF label, i.e. the keys of rack.shelves ("A", "B", ... "AZ").
// Each entry is one block on the map holding that shelf's 4 slots (A1-A4, B1-B4, ...).
// Two back-to-back rows per block, split by a cross aisle.
//
//   y=0  A  B  C  D  E  F  G  |  H  I  J  K  L  M
//   y=1  N  O  P  Q  R  S  T  |  U  V  W  X  Y  Z
//        ------------- main aisle -------------
//   y=4  AA AB AC AD AE AF AG |  AH AI AJ AK AL AM
//   y=5  AN AO AP AQ AR AS AT |  AU AV AW AX AY AZ
export const STARTER_LAYOUT = {
	// Block 1, row 1
	A: { x: 0, y: 0, w: 2, h: 1 },
	B: { x: 2, y: 0, w: 2, h: 1 },
	C: { x: 4, y: 0, w: 2, h: 1 },
	D: { x: 6, y: 0, w: 2, h: 1 },
	E: { x: 8, y: 0, w: 2, h: 1 },
	F: { x: 10, y: 0, w: 2, h: 1 },
	G: { x: 12, y: 0, w: 2, h: 1 },
	H: { x: 16, y: 0, w: 2, h: 1 },
	I: { x: 18, y: 0, w: 2, h: 1 },
	J: { x: 20, y: 0, w: 2, h: 1 },
	K: { x: 22, y: 0, w: 2, h: 1 },
	L: { x: 24, y: 0, w: 2, h: 1 },
	M: { x: 26, y: 0, w: 2, h: 1 },

	// Block 1, row 2 (back-to-back with row 1)
	N: { x: 0, y: 1, w: 2, h: 1 },
	O: { x: 2, y: 1, w: 2, h: 1 },
	P: { x: 4, y: 1, w: 2, h: 1 },
	Q: { x: 6, y: 1, w: 2, h: 1 },
	R: { x: 8, y: 1, w: 2, h: 1 },
	S: { x: 10, y: 1, w: 2, h: 1 },
	T: { x: 12, y: 1, w: 2, h: 1 },
	U: { x: 16, y: 1, w: 2, h: 1 },
	V: { x: 18, y: 1, w: 2, h: 1 },
	W: { x: 20, y: 1, w: 2, h: 1 },
	X: { x: 22, y: 1, w: 2, h: 1 },
	Y: { x: 24, y: 1, w: 2, h: 1 },
	Z: { x: 26, y: 1, w: 2, h: 1 },

	// Block 2, row 1
	AA: { x: 0, y: 4, w: 2, h: 1 },
	AB: { x: 2, y: 4, w: 2, h: 1 },
	AC: { x: 4, y: 4, w: 2, h: 1 },
	AD: { x: 6, y: 4, w: 2, h: 1 },
	AE: { x: 8, y: 4, w: 2, h: 1 },
	AF: { x: 10, y: 4, w: 2, h: 1 },
	AG: { x: 12, y: 4, w: 2, h: 1 },
	AH: { x: 16, y: 4, w: 2, h: 1 },
	AI: { x: 18, y: 4, w: 2, h: 1 },
	AJ: { x: 20, y: 4, w: 2, h: 1 },
	AK: { x: 22, y: 4, w: 2, h: 1 },
	AL: { x: 24, y: 4, w: 2, h: 1 },
	AM: { x: 26, y: 4, w: 2, h: 1 },

	// Block 2, row 2
	AN: { x: 0, y: 5, w: 2, h: 1 },
	AO: { x: 2, y: 5, w: 2, h: 1 },
	AP: { x: 4, y: 5, w: 2, h: 1 },
	AQ: { x: 6, y: 5, w: 2, h: 1 },
	AR: { x: 8, y: 5, w: 2, h: 1 },
	AS: { x: 10, y: 5, w: 2, h: 1 },
	AT: { x: 12, y: 5, w: 2, h: 1 },
	AU: { x: 16, y: 5, w: 2, h: 1 },
	AV: { x: 18, y: 5, w: 2, h: 1 },
	AW: { x: 20, y: 5, w: 2, h: 1 },
	AX: { x: 22, y: 5, w: 2, h: 1 },
	AY: { x: 24, y: 5, w: 2, h: 1 },
	AZ: { x: 26, y: 5, w: 2, h: 1 },
};