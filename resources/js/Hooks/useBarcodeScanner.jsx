import { useEffect, useRef } from "react";

const SCANNER_TIMEOUT_MS = 100;

const useBarcodeScanner = (onScan) => {
	const buffer = useRef("");
	const lastKeyTime = useRef(Date.now());

	useEffect(() => {
		const handleKeyDown = (e) => {
			const now = Date.now();
			const timeDiff = now - lastKeyTime.current;
			lastKeyTime.current = now;

			if (timeDiff > SCANNER_TIMEOUT_MS) {
				buffer.current = "";
			}

			if (e.key === "Enter") {
				const currentBuffer = buffer.current;

				if (currentBuffer.length > 2) {
					console.log("🚀 ~ ScanInput ~ value:", currentBuffer);
					onScan(currentBuffer, e);
					buffer.current = "";
				}
			} else if (e.key.length === 1) {
				buffer.current += e.key;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onScan]);
};

export default useBarcodeScanner;
