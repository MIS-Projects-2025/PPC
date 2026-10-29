import { create } from "zustand";

export const useF3PackagesStore = create((set, get) => {
	let abortController = null;

	const buildUrlWithParams = (baseUrl, params = {}) => {
		const query = new URLSearchParams(params).toString();
		return query ? `${baseUrl}?${query}` : baseUrl;
	};

	return {
		data: [],
		isLoading: false,
		isLoaded: false,
		errorMessage: null,

		appendPackage(packageName) {
			set((state) => {
				if (!packageName) return state;

				const exists = state.data.some((item) => item.id === packageName.id);
				if (exists) return state;

				const newData = [...state.data, packageName];
				newData.sort((a, b) => a.package_name.localeCompare(b.package_name));

				return { data: newData };
			});
		},

		updatePackage(updated) {
			set((state) => {
				const newData = state.data.map((item) =>
					item.id === updated.id ? { ...item, ...updated } : item,
				);
				newData.sort((a, b) => a.package_name.localeCompare(b.package_name));

				return { data: newData };
			});
		},

		removePackage(id) {
			set((state) => {
				const newData = state.data.filter((item) => item.id !== id);
				newData.sort((a, b) => a.package_name.localeCompare(b.package_name));

				return { data: newData };
			});
		},

		async fetchF3PackageNames(params = {}) {
			if (get().isLoaded) {
				return;
			}

			if (abortController) {
				abortController.abort();
			}

			const controller = new AbortController();
			abortController = controller;

			set({ isLoading: true, errorMessage: null });

			try {
				const url = buildUrlWithParams(
					route("api.f3.package.names.getAll"),
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
					set({ isLoaded: true });
				}
			} catch (error) {
				if (error.name !== "AbortError") {
					console.log("❌ Fetch error:", error);
					set({ errorMessage: error.message });
				}
			} finally {
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
