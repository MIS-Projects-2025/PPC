export class ApiError extends Error {
    constructor(message, status, errors) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

function xsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * @param {string} url
 * @param {{ method?: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown, signal?: AbortSignal }} [init]
 */
export async function api(url, init = {}) {
    const response = await fetch(url, {
        method: init.method ?? 'GET',
        credentials: 'same-origin',
        signal: init.signal,
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
            ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        let errors;
        try {
            const json = await response.json();
            errors = json.errors;
            message = (errors && Object.values(errors).flat()[0]) || json.message || message;
        } catch {
            /* non-JSON error body */
        }
        throw new ApiError(message, response.status, errors);
    }

    return response.status === 204 ? undefined : await response.json();
}
