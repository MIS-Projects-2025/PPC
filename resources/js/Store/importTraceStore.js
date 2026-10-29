import { create } from "zustand";

export const useImportTraceStore = create((set, get) => {
	let abortController = null;

	const buildUrlWithParams = (baseUrl, params = {}) => {
		const query = new URLSearchParams(params).toString();
		return query ? `${baseUrl}?${query}` : baseUrl;
	};

	return {
		data: {
			f1f2_wip: null,
			f1f2_out: null,
			f2_wip: null,
			f2_out: null,
			f3: null,
			capacity: null,
			pickUp: null,
			f3_pickup: null,
		},
		isLoaded: false,
		isLoading: false,
		errorMessage: null,

		async fetchAllImports(params = {}) {
			if (get().isLoaded) {
				return;
			}
			if (abortController) abortController.abort();
			const controller = new AbortController();
			abortController = controller;
			set({ isLoading: true, errorMessage: null });

			try {
				const url = buildUrlWithParams(
					route("api.import.trace.getAllLatestImports"),
					params,
				);
				const response = await fetch(url, {
					method: "GET",
					signal: abortController.signal,
					headers: {},
				});
				const result = await response.json();

				if (!response.ok || (result && result.status === "error")) {
					throw new Error(result?.message || `HTTP error: ${response.status}`);
				}

				if (controller === abortController) {
					set({ data: { ...get().data, ...result } });
				}
			} catch (err) {
				if (err.name !== "AbortError") set({ errorMessage: err.message });
			} finally {
				if (controller === abortController) set({ isLoading: false });
			}
		},

		async fetchImportByType(type, params = {}) {
			if (abortController) abortController.abort();
			const controller = new AbortController();
			abortController = controller;
			set({ isLoading: true, errorMessage: null });

			try {
				const url = buildUrlWithParams(
					route("api.import.trace.getImport", type),
					params,
				);
				const response = await fetch(url, {
					method: "GET",
					signal: abortController.signal,
					headers: {
					},
				});
				const result = await response.json();

				if (!response.ok || (result && result.status === "error")) {
					throw new Error(result?.message || `HTTP error: ${response.status}`);
				}

				if (controller === abortController) {
					set((state) => ({
						data: { ...state.data, [type]: result },
					}));
					set({ isLoaded: true });
				}
			} catch (err) {
				if (err.name !== "AbortError") set({ errorMessage: err.message });
			} finally {
				if (controller === abortController) set({ isLoading: false });
			}
		},

		async upsertImport(type, payload = {}) {
			if (abortController) abortController.abort();
			const controller = new AbortController();
			abortController = controller;
			set({ isLoading: true, errorMessage: null });

			try {
				const url = route("api.import.trace.upsertImport", type);
				const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
					signal: controller.signal,
				});

				const result = await response.json();

				if (!response.ok || (result && result.status === "error")) {
					throw new Error(result?.message || `HTTP error: ${response.status}`);
				}

				if (controller === abortController) {
					set((state) => ({
						data: {
							...state.data,
							[type]: {
								...state.data[type],
								...payload,
								latest_import: new Date().toISOString(),
							},
						},
					}));
				}
			} catch (err) {
				if (err.name !== "AbortError") set({ errorMessage: err.message });
			} finally {
				if (controller === abortController) set({ isLoading: false });
			}
		},

		abortFetch() {
			if (abortController) {
				abortController.abort();
				abortController = null;
				set({ isLoading: false });
			}
		},
	};
});
