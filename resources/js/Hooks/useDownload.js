import { useRef, useState } from "react";

export function useDownloadFile() {
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState(null);
	const abortControllerRef = useRef(null);

	const download = async (url, params = {}) => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		const controller = new AbortController();
		abortControllerRef.current = controller;

		setIsLoading(true);
		setErrorMessage(null);

		try {
			const query = new URLSearchParams(params).toString();
			const fetchUrl = query ? `${url}?${query}` : url;

			const response = await fetch(fetchUrl, {
				method: "GET",
				headers: {
				},
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new Error(`HTTP error: ${response.status}`);
			}

			const blob = await response.blob();
			const downloadUrl = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = downloadUrl;

			// Try to get filename from Content-Disposition header
			const disposition = response.headers.get("Content-Disposition");
			const filenameMatch = disposition?.match(/filename="?(.+)"?/);
			const filename = filenameMatch ? filenameMatch[1] : "download";

			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(downloadUrl);
		} catch (error) {
			if (error.name !== "AbortError") {
				setErrorMessage(error.message);
				console.error("Download error:", error);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const abort = () => {
		abortControllerRef.current?.abort();
	};

	return { download, isLoading, errorMessage, abort };
}
