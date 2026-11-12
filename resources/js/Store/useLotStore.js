import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";
import { parseLotScanInput } from "@/Lib/parseLotScanInput";
import { create } from "zustand";

const EMPTY_FORM = { lot_id: "", partname: "", qty: "" };

const EMPTY_MATCH = { status: "idle", data: null, warnings: [] }; // idle | loading | ready

const EMPTY_RECOMMENDATION = {
	status: "idle",
	id: null,
	slots: [],
	reason: null,
	prefilled: false,
	joins: false, // the lot joins a box set that is already in the rack
	plan: [], // [{ box_details, boxes, slots: [{ label, boxes }] }]
};

export const useLotStore = create((set, get) => ({
	lots: [],
	slots: [],
	socketId: null,
	withdrawerId: null,
	totalReceived: 0,
	totalReleased: 0,
	pendingLotToBeAdded: EMPTY_FORM,
	lotToBeReleased: null,
	slotPendingLot: [],
	lastAddedId: null,
	isScanning: false,
	editingLot: null,
	mode: LOT_UPSTREAM_MODES.RECEIVE,
	isEditMode: false,
	recentUpdates: {},
	scanResult: { status: null, at: 0 },
	lotMutations: {},
	recommendation: EMPTY_RECOMMENDATION,

	match: EMPTY_MATCH,
	matchRefreshKey: 0,

	setMatchLoading: () => set({ match: { ...EMPTY_MATCH, status: "loading" } }),
	setMatch: (data, warnings = []) => set({ match: { status: "ready", data, warnings } }),
	clearMatch: () => set({ match: EMPTY_MATCH }),
	bumpMatchRefresh: () => set((s) => ({ matchRefreshKey: s.matchRefreshKey + 1 })),

	setWithdrawerId: (id) => set({ withdrawerId: id }),
	clearWithdrawerId: () => set({ withdrawerId: null }),

	setLotToBeReleased: (id) => set({ lotToBeReleased: id }),
	clearLotToBeReleased: () => set({ lotToBeReleased: null }),

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

	setTotalReleased: (totalReleased) => set({ totalReleased }),
	setTotalReceived: (totalReceived) => set({ totalReceived }),
	incrementTotalReleased: () => set((state) => ({ totalReleased: state.totalReleased + 1 })),
	incrementTotalReceived: () => set((state) => ({ totalReceived: state.totalReceived + 1 })),
	setIsEditMode: (isEditMode) => set({ isEditMode }),
	setMode: (mode) => set({ mode }),
	setSlots: (slots) => set({ slots }),
	setSocketId: (socketId) => set({ socketId }),
	setScanResult: (status) => set({ scanResult: { status, at: Date.now() } }),
	setEditingLot: (lot) => set({ pendingLotToBeAdded: lot }),
	setIsScanning: (isScanning) => set({ isScanning }),
	setRecommendation: (rec) => set({ recommendation: { ...EMPTY_RECOMMENDATION, ...rec } }),
	clearRecommendation: () => set({ recommendation: EMPTY_RECOMMENDATION }),

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
			parsed.type === LOT_UPSTREAM_MODES.TYPE_LOT ||
			parsed.value.startsWith("[>>")
		) {
			return;
		}

		set((state) => ({
			pendingLotToBeAdded: {
				...state.pendingLotToBeAdded,
                [key]: rawInput,
			},
		}));
	},

	removePendingLot: () => set({ pendingLotToBeAdded: EMPTY_FORM }),

	toggleSlotPendingLot: (slot) =>
		set((state) => {
			const already = state.slotPendingLot.some((s) => s.id === slot.id);
			return {
				slotPendingLot: already
					? state.slotPendingLot.filter((s) => s.id !== slot.id)
					: [...state.slotPendingLot, slot],
				pendingLotToBeAdded: state.pendingLotToBeAdded?.box_group_id
					? { ...state.pendingLotToBeAdded }
					: state.pendingLotToBeAdded,
			};
		}),

	clearSlotPendingLot: () => set({ slotPendingLot: [] }),

	setSlotPendingLot: (slotPendingLot) => set({ slotPendingLot }),

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
			recommendation: EMPTY_RECOMMENDATION,
			match: EMPTY_MATCH,
		});
	},
}));
