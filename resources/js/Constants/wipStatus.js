const VALID_WIP_STATUSES = ["ok", "not_imported", "invalid_date"];

function formatDateLabel(date) {
    const target = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (target.toDateString() === today.toDateString()) return "Today's";
    if (target.toDateString() === yesterday.toDateString())
        return "Yesterday's";

    return (
        target.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }) + "'s"
    );
}

const statusMessages = {
    ok: () => "",
    not_imported: (date) =>
        `${formatDateLabel(date)} data hasn't been imported yet.`,
    invalid_date: () => "The selected date is invalid.",
};

export function getStatusMessage(date, status) {
    if (!VALID_WIP_STATUSES.includes(status)) {
        console.warn(`Unknown status: ${status}`);
        return "Unexpected error.";
    }
    return statusMessages[status](date);
}
