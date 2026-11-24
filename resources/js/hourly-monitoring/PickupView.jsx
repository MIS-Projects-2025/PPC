import { useEffect, useMemo, useState } from 'react';
import { DataGrid } from 'react-data-grid';
import { api } from './api';
import { buildPickupRows, pickupColumns } from './pickupUtils';

/**
 * Props: { url, date, line, config, collapsed?, onToggleShift? }
 *
 * Read-only pickup table (see PickupService): every lot is a row, every hour slot holds the quantity picked up in that hour.
 * One request per date feeds the F1 / F2 / F3 sub tabs (`line` only chooses which one is shown).
 * The DAY / NIGHT SHIFT headers collapse exactly like they do in HourlyGrid.
 */
export default function PickupView({ url, date, line, config, collapsed, onToggleShift }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [version, setVersion] = useState(0); // bumped by "Refresh"

    useEffect(() => {
        const controller = new AbortController();
        setData(null);
        setError(null);
        api(`${url}?date=${encodeURIComponent(date)}`, { signal: controller.signal })
            .then(setData)
            .catch((e) => !controller.signal.aborted && setError(e.message));
        return () => controller.abort();
    }, [url, date, version]);

    const columns = useMemo(() => pickupColumns(config, collapsed), [config, collapsed]);
    const rows = useMemo(() => buildPickupRows(data?.lines?.[line]?.rows ?? [], config), [data, line, config]);

    const onHeaderClick = (e) => {
        const group = e.target.closest?.('.hm-group-day, .hm-group-night');
        if (group && onToggleShift) onToggleShift(group.classList.contains('hm-group-night') ? 'night' : 'day');
    };

    return (
        <div className="hm-gridwrap" onClick={onHeaderClick}>
            <div className="hm-toolbar">
                <button type="button" className="hm-btn" onClick={() => setVersion((v) => v + 1)}>
                    Refresh
                </button>
                <span className="hm-hint">Read-only · quantity of every lot picked up per hour</span>
                {error && (
                    <span className="hm-error" role="alert">
                        {error}
                    </span>
                )}
            </div>
            {!data && !error ? (
                <div className="hm-empty">Loading pickup…</div>
            ) : (
                <DataGrid
                    className="rdg-light hm-grid"
                    columns={columns}
                    rows={rows}
                    rowKeyGetter={(row) => row.id}
                    rowClass={(row) => (row.__kind ? `hm-total-row is-${row.__kind}` : undefined)}
                    rowHeight={30}
                    headerRowHeight={32}
                    renderers={{ noRowsFallback: <div className="hm-empty">No pickup lots for this day.</div> }}
                />
            )}
        </div>
    );
}
