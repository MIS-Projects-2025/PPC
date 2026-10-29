import { create } from "zustand";

export const useF1F2PackagesStore = create((set, get) => {
	let abortController = null;

	const buildUrlWithParams = (baseUrl, params = {}) => {
		const query = new URLSearchParams(params).toString();
		return query ? `${baseUrl}?${query}` : baseUrl;
	};

	return {
		data: null,
		isLoading: false,
		errorMessage: null,

		async fetchPackages(params = {}) {
			if (abortController) {
				abortController.abort();
			}

			const controller = new AbortController();
			abortController = controller;

			set({ isLoading: true, errorMessage: null });

			try {
				const url = buildUrlWithParams(
					route("api.wip.distinctPackages"),
					params,
				);

				const response = await fetch(url, {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
					signal: abortController.signal,
				});

				let result;
				try {
					result = await response.json();
				} catch {
					const error = new Error("Invalid JSON response from server");
					error.status = response.status;
					throw error;
				}

				if (!response.ok || (result && result.status === "error")) {
					const error = new Error(
						result?.message || `HTTP error: ${response.status}`,
					);
					error.status = response.status;
					error.data = result;
					throw error;
				}

				if (controller === abortController) {
					set({ data: result });
				}
			} catch (error) {
				if (error.name !== "AbortError") {
					console.log("❌ Fetch error:", error);
					set({ errorMessage: error.message });
				}
			} finally {
				console.log("Set loading FALSE");
				if (controller === abortController) {
					set({ isLoading: false });
				}
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
