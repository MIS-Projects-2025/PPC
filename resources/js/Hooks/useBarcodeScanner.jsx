import { useEffect, useRef } from "react";

const SCANNER_MAX_INTERVAL_MS = 30; // tune against your actual scanner — most HID scanners are <20ms/char
const IDLE_RESET_MS = 1000; // a pause this long means "new sequence," not "slow scan"
const MIN_SCAN_LENGTH = 1; // tune to your shortest real barcode payload

const useBarcodeScanner = (onScan) => {
    const buffer = useRef("");
    const lastKeyTime = useRef(0);
    const looksLikeScan = useRef(true);
    const onScanRef = useRef(onScan);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        const reset = () => {
            buffer.current = "";
            looksLikeScan.current = true;
        };

        const handleKeyDown = (e) => {
            const now = Date.now();
            const gap = now - lastKeyTime.current;
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
                        reset(); // long pause: treat as a brand new sequence
                    } else if (gap > SCANNER_MAX_INTERVAL_MS) {
                        looksLikeScan.current = false; // one slow gap disqualifies this run
                    }
                }
                buffer.current += e.key;
                // never preventDefault here — the character always reaches
                // whatever element is actually focused, same as if this
                // hook didn't exist
            }
        };

        document.addEventListener("keydown", handleKeyDown, true);
        return () =>
            document.removeEventListener("keydown", handleKeyDown, true);
    }, []);
};

export default useBarcodeScanner;
