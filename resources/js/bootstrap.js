import axios from "axios";
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.axios = axios;

window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || "mt1",
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: false,
    disableStats: true,
    enabledTransports: ["ws"],
    // authEndpoint: "http://192.168.2.221:8194/MTS/broadcasting/auth",
    // auth: {
    //     headers: {
    //         "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')
    //             ?.content,
    //         Accept: "application/json",
    //     },
    //     withCredentials: true,
    // },
});

// Test connection
// window.echo.connector.pusher.connection.bind("connected", () => {
//     console.log("✅ Connected to Soketi WebSocket server!");
// });

// window.echo.connector.pusher.connection.bind("error", (err) => {
//     console.error("❌ WebSocket connection error:", err);
// });
