import { create } from "zustand";
import { router } from "@inertiajs/react";

export const useWipStore = create((set, get) => ({
	wip: {},
	latest: null,
	yesterday: null,
	trend: 0,
	isLoading: false,
	errorMessage: null,
	abortController: null,

	fetchWip: async () => {
		// Abort any ongoing request first
		const prevController = get().abortController;
		if (prevController) prevController.abort();

		const controller = new AbortController();
		set({ isLoading: true, errorMessage: null, abortController: controller });

		try {

			const response = await fetch(route("api.wip.today"), {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				signal: controller.signal,
			});

			let json;
			try {
				json = await response.json();
			} catch {
				throw new Error("Invalid JSON response from server");
			}

			if (!response.ok || (json && json.status === "error")) {
				const message = json?.message || `HTTP error: ${response.status}`;
				throw new Error(message);
			}

			if (!Array.isArray(json) || json.length === 0) {
				throw new Error("No WIP data available");
			}

			const sorted = [...json].sort(
				(a, b) => new Date(a.date) - new Date(b.date),
			);

			const withTrend = sorted.map((item, index, arr) => {
				if (index === 0) return { ...item, trend: 0 };
				const prev = arr[index - 1];
				let dayTrend =
					prev.total > 0 ? ((item.total - prev.total) / prev.total) * 100 : 0;
				return { ...item, trend: Math.round(dayTrend * 100) / 100 };
			});

			const wipObject = withTrend.reduce((acc, item) => {
				acc[item.date] = item;
				return acc;
			}, {});

			const todayData = withTrend[withTrend.length - 1];
			const yesterdayData =
				withTrend.length > 1 ? withTrend[withTrend.length - 2] : null;

			if (!controller.signal.aborted) {
				set({
					wip: wipObject,
					latest: todayData,
					yesterday: yesterdayData,
					trend: todayData.trend,
					isLoading: false,
				});
			}
		} catch (err) {
			if (err.name === "AbortError") return;
			set({ errorMessage: err.message, isLoading: false });
		} finally {
			if (!controller.signal.aborted) {
				set({ isLoading: false });
			}
		}
	},
}));

// Automatically abort when Inertia navigation starts
router.on("start", () => {
	const { abortController } = useWipStore.getState();
	if (abortController) abortController.abort();
});
