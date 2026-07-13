const VALID_WIP_STATUSES = ["ok", "not_imported", "invalid_date"];

const statusMessages = {
    ok: "",
    not_imported: "Today's data hasn't been imported yet.",
    invalid_date: "The selected date is invalid.",
};

export function getStatusMessage(status) {
    if (!VALID_WIP_STATUSES.includes(status)) {
        console.warn(`Unknown status: ${status}`);
    }
    return statusMessages[status] ?? "Unexpected error.";
}
