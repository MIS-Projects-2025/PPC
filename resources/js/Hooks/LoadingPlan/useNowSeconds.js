
import { useSyncExternalStore } from "react";

const subscribers = new Set();
let timer = null;

const getSnapshot = () => Math.floor(Date.now() / 1000);

function notify() {
    subscribers.forEach((callback) => callback());
}

function subscribe(callback) {
    subscribers.add(callback);

    if (!timer) {
        const tick = () => {
            if (subscribers.size === 0) { timer = null; return; }
            
            notify();

            // Align the next update to the next whole second.
            const delay = 1000 - (Date.now() % 1000);
            timer = setTimeout(tick, delay);
        };

        timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    }

    return () => {
        subscribers.delete(callback);

        if (subscribers.size === 0 && timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    };
}

export function useNowSeconds() {
    return useSyncExternalStore(
        subscribe,
        getSnapshot,
        getSnapshot
    );
}
