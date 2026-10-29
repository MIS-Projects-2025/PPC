import { useEffect, useRef, useState } from "react";

export function useFetch(url, options = {}) {
	const fetchIdRef = useRef(0);
	const { params = {}, auto = true } = options;

	const [data, setData] = useState(null);
	const [isLoading, setIsLoading] = useState(auto);
	const [errorMessage, setErrorMessage] = useState(null);
	const abortControllerRef = useRef(null);

	const buildUrlWithParams = (baseUrl, params) => {
		const query = new URLSearchParams(params).toString();
		return query ? `${baseUrl}?${query}` : baseUrl;
	};

	const fetchData = async (currentParams = params) => {
		const id = ++fetchIdRef.current;

		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		const controller = new AbortController();
		abortControllerRef.current = controller;

		setIsLoading(true);
		setErrorMessage(null);

		try {
			const fetchUrl = buildUrlWithParams(url, currentParams);
			const response = await fetch(fetchUrl, {
				method: "GET",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				credentials: "same-origin",
				signal: controller.signal,
			});

			let result;
			try {
				result = await response.json();
			} catch (jsonErr) {
				const error = new Error("Invalid JSON response from server");
				error.status = response.status;
				throw error;
			}

			if (response.status === 401) {
				window.location.href = route("login");
				return;
			}

			if (!response.ok || (result && result.status === "error")) {
				const error = new Error(
					result?.message || `HTTP error: ${response.status}`,
				);
				error.status = response.status;
				error.data = result;
				throw error;
			}

			setData(result);
		} catch (error) {
			console.log("🚀 ~ fetchData ~ err:", error);
			if (error.name !== "AbortError") {
				setErrorMessage(error.message);
			}
		} finally {
			if (id === fetchIdRef.current) {
				setIsLoading(false);
			}
		}
	};

	useEffect(() => {
		if (auto) {
			fetchData(params);
		}
	}, [url, auto]);

	return {
		data,
		isLoading,
		errorMessage,
		fetch: (overrideParams = params) => fetchData(overrideParams),
		abort: () => abortControllerRef.current?.abort(),
	};
}
