import { useEffect, useRef, useState } from "react";
import { useToast } from "./useToast";

export function useMutation() {
	const toast = useToast();
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState(null);
	const [errorData, setErrorData] = useState(null);
	const [data, setData] = useState(null);

	const abortControllersRef = useRef({});

	const mutate = async (url, options = {}) => {
		const { cancelPrevious = false, mutationKey = "default" } = options;

		if (cancelPrevious && abortControllersRef.current[mutationKey]) {
			abortControllersRef.current[mutationKey].abort();
		}

		const controller = new AbortController();
		abortControllersRef.current[mutationKey] = controller;

		setIsLoading(true);
		setErrorMessage(null);
		setErrorData(null);

		try {
			const {
				method = "POST",
				body,
				isFormData = false,
				isContentTypeInclude = true,
				additionalHeaders = {},
			} = options;

			const token = localStorage.getItem("authify-token");

			const response = await fetch(url, {
				method,
				headers: {
					...(isContentTypeInclude && { "Content-Type": "application/json" }),
					Accept: "application/json",
					"X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')
						?.content,
					...(token ? { Authorization: `Bearer ${token}` } : {}),
					...additionalHeaders,
				},
				body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
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

			if (!response.ok || (result && result.status === "error")) {
				const error = new Error(
					result?.message || `HTTP error: ${response.status}`,
				);
				error.status = response.status;
				error.data = result;
				throw error;
			}

			setData(result);
			return result;
		} catch (error) {
			if (error.name !== "AbortError") {
				setErrorData(error.data);
				setErrorMessage(error.message);
				throw error;
			}
			throw error;
		} finally {
			delete abortControllersRef.current[mutationKey];
			setIsLoading(false);
		}
	};

	useEffect(() => {
		return () => {
			Object.values(abortControllersRef.current).forEach((controller) =>
				controller.abort(),
			);
		};
	}, []);

	const cancel = (mutationKey = "default") => {
		abortControllersRef.current[mutationKey]?.abort();
	};

	return { mutate, data, errorMessage, errorData, isLoading, cancel };
}
