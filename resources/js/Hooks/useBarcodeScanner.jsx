import { useEffect, useRef } from "react";

const SCANNER_TIMEOUT_MS = 100;

const useBarcodeScanner = (onScan) => {
	const buffer = useRef("");
	const lastKeyTime = useRef(Date.now());
	const onScanRef = useRef(onScan);

	useEffect(() => {
		onScanRef.current = onScan;
	}, [onScan]);

	useEffect(() => {
		const handleKeyDown = (e) => {
			const now = Date.now();
			const timeDiff = now - lastKeyTime.current;
			lastKeyTime.current = now;

			if (e.key === "Enter") {
				const currentBuffer = buffer.current;
				buffer.current = "";

				if (currentBuffer.length > 2) {
					onScanRef.current(currentBuffer, e);
				}
			} else if (e.key.length === 1) {
				if (timeDiff > SCANNER_TIMEOUT_MS) {
					buffer.current = "";
				} else {
					// Chars 2+ arriving fast = definitely a scanner, block from input
					e.preventDefault();
				}
				buffer.current += e.key;
			}
		};

		window.addEventListener("keydown", handleKeyDown, true);
		return () => window.removeEventListener("keydown", handleKeyDown, true);
	}, []);
};

export default useBarcodeScanner;
