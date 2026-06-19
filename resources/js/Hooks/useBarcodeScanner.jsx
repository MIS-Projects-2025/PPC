import { useEffect, useRef } from "react";

const SCANNER_MAX_INTERVAL_MS = 30; // tune against your actual scanner — most HID scanners are <20ms/char
const IDLE_RESET_MS = 1000; // a pause this long means "new sequence," not "slow scan"
const MIN_SCAN_LENGTH = 4; // tune to your shortest real barcode payload

const useBarcodeScanner = (onScan) => {
    const buffer = useRef("");
    const lastKeyTime = useRef(null);
    const looksLikeScan = useRef(true);
    const onScanRef = useRef(onScan);
    const slowGapCount = useRef(0);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        const reset = () => {
            buffer.current = "";
            looksLikeScan.current = true;
            slowGapCount.current = 0;
        };

        const handleKeyDown = (e) => {
            const now = Date.now();
            const gap =
                lastKeyTime.current === null ? 0 : now - lastKeyTime.current;
            lastKeyTime.current = now;

            if (e.key === "Enter") {
                const candidate = buffer.current;
                const wasScan =
                    looksLikeScan.current &&
                    candidate.length >= MIN_SCAN_LENGTH;

                reset();

                if (wasScan) {
                    e.preventDefault(); // only ever swallow the terminating Enter
                    onScanRef.current(candidate, e);
                }
                // not a scan -> let Enter do whatever it would normally do
                return;
            }

            if (e.key.length === 1) {
                if (buffer.current.length > 0) {
                    if (gap > IDLE_RESET_MS) {
                        reset();
                        slowGapCount.current = 0;
                    } else if (gap > SCANNER_MAX_INTERVAL_MS) {
                        slowGapCount.current++;
                        if (slowGapCount.current >= 2) {
                            looksLikeScan.current = false;
                        }
                    } else {
                        slowGapCount.current = 0; // reset on fast gap
                    }
                }
                buffer.current += e.key;
            }
        };

        const handleFocusIn = (e) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                reset();
            }
        };

        document.addEventListener("keydown", handleKeyDown, true);
        document.addEventListener("focusin", handleFocusIn, true);
        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
            document.removeEventListener("focusin", handleFocusIn, true);
        };
    }, []);
};

export default useBarcodeScanner;
