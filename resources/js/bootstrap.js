import axios from "axios";

window.axios = axios;
window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

// Default: Reverb is disabled.
window.Echo = null;
window.EchoReady = Promise.resolve(null);

if (import.meta.env.VITE_ENABLE_REVERB === "true") {
    window.EchoReady = import("laravel-echo")
        .then(({ default: Echo }) => {
            const echo = new Echo({
                broadcaster: "reverb",
                key: import.meta.env.VITE_REVERB_APP_KEY,
                wsHost: import.meta.env.VITE_REVERB_HOST,
                wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
                wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
                forceTLS: false,
                disableStats: true,
                enabledTransports: ["ws"],
            });

            window.Echo = echo;

            return echo;
        })
        .catch((error) => {
            console.error("Failed to initialize Laravel Echo:", error);
            return null;
        });
}