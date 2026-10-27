import { useCallback, useEffect, useRef, useState } from "react";

export function useMutation({ track = true } = {}) {
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [errorData, setErrorData] = useState(null);
    const [data, setData] = useState(null);

    const abortControllersRef = useRef({});
    const inFlightRef = useRef(0);

    const mutate = useCallback(async (url, options = {}) => {
        const { cancelPrevious = false, mutationKey = "default" } = options;

        if (cancelPrevious) abortControllersRef.current[mutationKey]?.abort();

        const controller = new AbortController();
        abortControllersRef.current[mutationKey] = controller;
        inFlightRef.current += 1;

        if (track) {
            setIsLoading(true);
            setErrorMessage(null);
            setErrorData(null);
        }

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
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content,
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...additionalHeaders,
                },
                body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
                signal: controller.signal,
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
                const error = new Error(result?.message || `HTTP error: ${response.status}`);
                error.status = response.status;
                error.data = result;
                throw error;
            }

            if (track) setData(result);
            return result;
        } catch (error) {
            if (track && error.name !== "AbortError") {
                setErrorData(error.data);
                setErrorMessage(error.message);
            }
            throw error;
        } finally {
            // only remove our own controller; a concurrent request may own the key now
            if (abortControllersRef.current[mutationKey] === controller) {
                delete abortControllersRef.current[mutationKey];
            }
            inFlightRef.current -= 1;
            if (track) setIsLoading(inFlightRef.current > 0);
        }
    }, [track]);

    useEffect(() => {
        const controllers = abortControllersRef.current;
        return () => Object.values(controllers).forEach((c) => c.abort());
    }, []);

    const cancel = useCallback((key = "default") => {
        abortControllersRef.current[key]?.abort();
    }, []);

    return { mutate, data, errorMessage, errorData, isLoading, cancel };
}