export const errMsg = (err) => {
    const d = err?.response?.data;
    if (d?.errors) return Object.values(d.errors).flat().join(' ');
    return d?.message || err?.message || 'Request failed';
};

// Local (not UTC) date, so it's still "today" before 8am in PH.
export const today = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function Alert({ msg, onClose }) {
    if (!msg) return null;
    return (
        <div role="alert" className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'} mb-4`}>
            <span>{msg.text}</span>
            <button type="button" className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>
    );
}