import { router } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";

export function useWip() {
	const [wip, setWip] = useState({});
	const [latest, setLatest] = useState(null);
	const [yesterday, setYesterday] = useState(null);
	const [trend, setTrend] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState(null);
	const abortControllerRef = useRef(null);

	useEffect(() => {
		let mounted = true;
		const controller = new AbortController();
		abortControllerRef.current = controller;

		async function fetchWip() {
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
				} catch (jsonErr) {
					const error = new Error("Invalid JSON response from server");
					error.status = response.status;
					throw error;
				}

				if (!response.ok || (json && json.status === "error")) {
					const error = new Error(
						json?.message || `HTTP error: ${response.status}`,
					);
					error.status = response.status;
					error.data = json;
					throw error;
				}

				if (json.length > 0) {
					const sorted = [...json].sort(
						(a, b) => new Date(a.date) - new Date(b.date),
					);

					const withTrend = sorted.map((item, index, arr) => {
						if (index === 0) return { ...item, trend: 0 };
						const prev = arr[index - 1];
						let dayTrend =
							prev.total > 0
								? ((item.total - prev.total) / prev.total) * 100
								: 0;

						dayTrend = Math.round(dayTrend * 100) / 100;
						return { ...item, trend: dayTrend };
					});

					const wipObject = withTrend.reduce((acc, item) => {
						acc[item.date] = item;
						return acc;
					}, {});

					if (mounted) {
						setWip(wipObject);
						const todayData = withTrend[withTrend.length - 1];
						const yesterdayData =
							withTrend.length > 1 ? withTrend[withTrend.length - 2] : null;

						setLatest(todayData);
						setYesterday(yesterdayData);
						setTrend(todayData.trend);

						setIsLoading(false);
					}
				} else {
					throw new Error("No WIP data available");
				}
			} catch (err) {
				if (err.name === "AbortError") return;
				setErrorMessage(err.message);
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		}

		fetchWip();

		const handleInertiaStart = () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
		// https://chatgpt.com/c/690c533b-0340-8324-9c77-fa7f4ada4884 continue...
		const removeInertiaListener = router.on("start", handleInertiaStart);

		return () => {
			removeInertiaListener();
			mounted = false;
			abortControllerRef.current?.abort();
		};
	}, []);

	return { wip, latest, yesterday, trend, isLoading, errorMessage };
}
