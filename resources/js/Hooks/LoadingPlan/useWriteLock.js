import { useMutation } from "@/Hooks/useMutation";
import { useCallback, useRef, useState } from "react";

const STALE_STATUSES = new Set([404, 409]);

/**
 * One write at a time. Tracks in-flight requests, and flips into a "stale"
 * state when the server says the plan changed under us (409/404).
 */
export function useWriteLock({ readOnly, toast }) {
    const { mutate: rawMutate } = useMutation({ track: false });

    const inFlightRef = useRef(0);
    const [inFlightCount, setInFlightCount] = useState(0);

    const [staleInfo, setStaleInfo] = useState(null);
    const staleRef = useRef(null);
    staleRef.current = staleInfo;

    const isUpdating = inFlightCount > 0;
    const writesLocked = isUpdating || !!staleInfo;

    const isSaving = useCallback(() => inFlightRef.current > 0, []);
    const isLocked = useCallback(() => inFlightRef.current > 0 || !!staleRef.current, []);
    const clearStale = useCallback(() => setStaleInfo(null), []);

    /** Call at the start of every write. Returns false (and tells the user why) if it can't proceed. */
    const beginWrite = useCallback(() => {
        if (readOnly) return false;
        if (inFlightRef.current > 0) {
            toast?.info?.("Still saving the previous change…", { id: "write-locked" });
            return false;
        }
        if (staleRef.current) {
            toast?.info?.("This plan has been changed somewhere by someone. Refresh first");
            return false;
        }
        return true;
    }, [readOnly, toast]);

    const mutate = useCallback(
        (...args) =>
            rawMutate(...args).catch((err) => {
                const status = err?.status ?? err?.response?.status;
                if (STALE_STATUSES.has(status)) {
                    staleRef.current = { message: err?.message };
                    setStaleInfo(staleRef.current);
                }
                throw err;
            }),
        [rawMutate],
    );

    /** Holds the lock until the returned function is called (idempotent). */
    const holdLock = useCallback(() => {
        inFlightRef.current += 1;
        setInFlightCount((c) => c + 1);
        let released = false;
        return () => {
            if (released) return;
            released = true;
            inFlightRef.current -= 1;
            setInFlightCount((c) => c - 1);
        };
    }, []);

    const withUpdating = useCallback(
        (maybePromise) => {
            const release = holdLock();
            return Promise.resolve(maybePromise).finally(release);
        },
        [holdLock],
    );

    return {
        mutate,
        beginWrite,
        isLocked,
        isSaving,
        holdLock,
        withUpdating,
        isUpdating,
        writesLocked,
        staleInfo,
        clearStale,
    };
}