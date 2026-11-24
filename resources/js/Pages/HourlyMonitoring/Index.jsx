import { Head, router } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import 'react-data-grid/lib/styles.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toGridRow } from '../../hourly-monitoring/cellUtils';
import '../../hourly-monitoring/hourly-monitoring.css';
import HourlyGrid from '../../hourly-monitoring/HourlyGrid';
import SummaryView from '../../hourly-monitoring/SummaryView';

/**
 * Props: { date, sheets, downtimeCodes, config, urls: { index, employees, summary } }
 * Tabs: 'tnr' | 'fvi' | 'summary'
 */

const parseYmd = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
};
const formatYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shift = (value, days) => {
    const d = parseYmd(value);
    d.setDate(d.getDate() + days);
    return formatYmd(d);
};

function Workspace({ date, sheets, downtimeCodes, config, urls }) {
    const [tab, setTab] = useState('tnr');
    const [line, setLine] = useState({ tnr: config.lines.tnr[0], fvi: config.lines.fvi[0] });
    // Rows live here so they survive switching tabs; the server stays the source of truth.
    const [rowsBySheet, setRowsBySheet] = useState(() =>
        Object.fromEntries(sheets.map((s) => [s.id, s.rows.map(toGridRow)])),
    );

    const setRows = useCallback(
        (sheetId, next) =>
            setRowsBySheet((prev) => ({
                ...prev,
                [sheetId]: typeof next === 'function' ? next(prev[sheetId] ?? []) : next,
            })),
        [],
    );

    const go = (value) => router.get(urls.index, { date: value }, { preserveState: false, preserveScroll: true });
    const sheet = tab === 'summary' ? undefined : sheets.find((s) => s.type === tab && s.line === line[tab]);

    return (
        <div className="hm-page">
            <header className="hm-header">
                <h1>Hourly Monitoring</h1>
                <div className="hm-date">
                    <button type="button" className="hm-btn" onClick={() => go(shift(date, -1))} aria-label="Previous day">
                        ‹
                    </button>
                    <DatePicker selected={parseYmd(date)} onChange={(d) => d && go(formatYmd(d))} dateFormat="yyyy-MM-dd" />
                    <button type="button" className="hm-btn" onClick={() => go(shift(date, 1))} aria-label="Next day">
                        ›
                    </button>
                </div>
            </header>

            <nav className="hm-tabs" role="tablist">
                {['tnr', 'fvi', 'summary'].map((t) => (
                    <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : undefined} onClick={() => setTab(t)}>
                        {t === 'summary' ? 'Summary' : t.toUpperCase()}
                    </button>
                ))}
            </nav>

            {tab !== 'summary' && (
                <nav className="hm-tabs hm-subtabs" role="tablist">
                    {config.lines[tab].map((l) => (
                        <button
                            key={l}
                            role="tab"
                            aria-selected={line[tab] === l}
                            className={line[tab] === l ? 'is-active' : undefined}
                            onClick={() => setLine((prev) => ({ ...prev, [tab]: l }))}
                        >
                            {l}
                        </button>
                    ))}
                </nav>
            )}

            {tab === 'summary' && <SummaryView url={urls.summary} date={date} />}
            {sheet && (
                <HourlyGrid
                    key={sheet.id}
                    sheet={sheet}
                    rows={rowsBySheet[sheet.id] ?? []}
                    setRows={setRows}
                    codes={downtimeCodes}
                    config={config}
                    employeesUrl={urls.employees}
                />
            )}
        </div>
    );
}

export default function Index(props) {
    // key={date}: every new date starts from fresh state (including the employee dropdowns).
    return (
        <>
            <Head title="Hourly Monitoring" />
            <Workspace key={props.date} {...props} />
        </>
    );
}
