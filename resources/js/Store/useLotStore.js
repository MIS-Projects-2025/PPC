import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";
import { parseLotScanInput } from "@/Lib/parseLotScanInput";
import { create } from "zustand";

const EMPTY_FORM = { lot_id: "", partname: "", qty: "" };

export const useLotStore = create((set, get) => ({
	lots: [],
	slots: [],
	socketId: null,
	pendingLotToBeAdded: EMPTY_FORM,
	slotPendingLot: [],
	lastAddedId: null,
	isScanning: false,
	editingLot: null,
	mode: LOT_UPSTREAM_MODES.RECEIVE,
	recentUpdates: {},
	scanResult: { status: null, at: 0 },
	lotMutations: {},

	setLotLoading: (lotId, isLoading) =>
		set((state) => ({
			lotMutations: {
				...state.lotMutations,
				[lotId]: {
					...state.lotMutations[lotId],
					isLoading,
					// reset error when starting a new request
					error: isLoading ? null : (state.lotMutations[lotId]?.error ?? null),
				},
			},
		})),

	setLotError: (lotId, error) =>
		set((state) => ({
			lotMutations: {
				...state.lotMutations,
				[lotId]: {
					...state.lotMutations[lotId],
					isLoading: false,
					error,
				},
			},
		})),

	clearLotMutation: (lotId) =>
		set((state) => {
			const next = { ...state.lotMutations };
			delete next[lotId];
			return { lotMutations: next };
		}),

	setMode: (mode) => set({ mode }),
	setSlots: (slots) => set({ slots }),
	setSocketId: (socketId) => set({ socketId }),
	setScanResult: (status) => set({ scanResult: { status, at: Date.now() } }),
	setEditingLot: (lot) => set({ pendingLotToBeAdded: lot }),
	setIsScanning: (isScanning) => set({ isScanning }),

	addPendingLot: (data) => set({ pendingLotToBeAdded: data }),

	editPendingLot: (key, value) => {
		set((state) => ({
			pendingLotToBeAdded: { ...state.pendingLotToBeAdded, [key]: value },
		}));
	},

	editPendingLotWithRawInput: (key, rawInput) => {
		const parsed = parseLotScanInput(rawInput);

		if (
			parsed.type === LOT_UPSTREAM_MODES.TYPE_SLOT ||
			parsed.type === LOT_UPSTREAM_MODES.TYPE_FIELD_SELECT ||
			parsed.type === LOT_UPSTREAM_MODES.TYPE_COMMAND ||
			parsed.value.startsWith("[>>")
		) {
			return;
		}

		set((state) => ({
			pendingLotToBeAdded: {
				...state.pendingLotToBeAdded,
				[key]: parsed.value,
			},
		}));
	},

	removePendingLot: () => set({ pendingLotToBeAdded: EMPTY_FORM }),

	toggleSlotPendingLot: (slot) =>
		set((state) => {
			console.log("xxxxxxxxx TOGGGGGGGGLE", slot);
			const already = state.slotPendingLot.some((s) => s.id === slot.id);
			return {
				slotPendingLot: already
					? state.slotPendingLot.filter((s) => s.id !== slot.id)
					: [...state.slotPendingLot, slot],
			};
		}),

	clearSlotPendingLot: () => set({ slotPendingLot: [] }),

	removeSlotPendingLot: (slotId) =>
		set((state) => ({
			slotPendingLot: state.slotPendingLot.filter((s) => s.id !== slotId),
		})),

	isSlotSelected: (slotId) => get().slotPendingLot.some((s) => s.id === slotId),

	receiveLot: (data) => {
		set((state) => ({ lots: [data, ...state.lots], lastAddedId: data.id }));
		setTimeout(() => set({ lastAddedId: null }), 1000);
	},

	removeLot: (id) =>
		set((state) => ({ lots: state.lots.filter((l) => l.id !== id) })),

	updateLot: (id, updatedData) => {
		console.log("[store] updateLot called", id, updatedData?.status);
		set((state) => ({
			lots: state.lots.map((l) => (l.id === id ? { ...l, ...updatedData } : l)),
		}));
	},
	// updateLot: (id, updatedData) =>
	// 	set((state) => ({
	// 		lots: state.lots.map((l) => (l.id === id ? { ...l, ...updatedData } : l)),
	// 	})),

	appendRecentUpdate: (id, user, action) =>
		set((state) => ({
			recentUpdates: {
				...state.recentUpdates,
				[id]: {
					user: user || "System",
					action: action || "did something on",
				},
			},
		})),

	clearRecentUpdate: (id) =>
		set((state) => {
			const next = { ...state.recentUpdates };
			delete next[id];
			return { recentUpdates: next };
		}),

	clearEditingLot: () => set({ editingLot: null }),
	initialize: (lots) => set({ lots }),

	resetAll: () => {
		set({
			slotPendingLot: [],
			pendingLotToBeAdded: EMPTY_FORM,
			editingLot: null,
		});
	},
}));
