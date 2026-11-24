import { Head, router } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';
import 'react-data-grid/lib/styles.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { lineFamily, toGridRow } from '../../hourly-monitoring/cellUtils';
import '../../hourly-monitoring/hourly-monitoring.css';
import HourlyGrid from '../../hourly-monitoring/HourlyGrid';
import PickupView from '../../hourly-monitoring/PickupView';
import SummaryView from '../../hourly-monitoring/SummaryView';

/**
 * Props: { date, sheets, downtimeCodes, packageTypes, config, urls: { index, employees, summary, pickup } }
 * Tabs: 'tnr' | 'pickup' | 'fvi' | 'boxing' | 'summary'
 * 'pickup' is read-only and has no sheets: config.lines.pickup lists its sub tabs, PickupView loads its data.
 */

const TABS = ['tnr', 'pickup', 'fvi', 'boxing', 'summary'];
const SHIFT_TITLES = { day: 'Day shift (7am–7pm)', night: 'Night shift (7pm–7am)' };

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

function Workspace({ date, sheets, downtimeCodes, packageTypes: knownPackageTypes, config, urls }) {
    const [tab, setTab] = useState('tnr');
    const [line, setLine] = useState(() => Object.fromEntries(Object.entries(config.lines).map(([type, lines]) => [type, lines[0]])));
    // Rows live here so they survive switching tabs; the server stays the source of truth.
    const [rowsBySheet, setRowsBySheet] = useState(() =>
        Object.fromEntries(sheets.map((s) => [s.id, s.rows.map(toGridRow)])),
    );
    // DAY / NIGHT SHIFT column groups: one shared state, so a collapsed shift stays out of the way on every tab.
    const [collapsed, setCollapsed] = useState({ day: false, night: false });
    const toggleShift = useCallback((s) => setCollapsed((prev) => ({ ...prev, [s]: !prev[s] })), []);
    const [exporting, setExporting] = useState(false);

    const setRows = useCallback(
        (sheetId, next) =>
            setRowsBySheet((prev) => ({
                ...prev,
                [sheetId]: typeof next === 'function' ? next(prev[sheetId] ?? []) : next,
            })),
        [],
    );

    // Package type suggestions: everything saved so far plus what is typed in any TNR sheet of this day.
    const packageTypes = useMemo(() => {
        const seen = new Map();
        const add = (value) => {
            const text = String(value ?? '').trim();
            if (text && !seen.has(text.toUpperCase())) seen.set(text.toUpperCase(), text);
        };
        knownPackageTypes.forEach(add);
        sheets.filter((s) => s.type === 'tnr').forEach((s) => (rowsBySheet[s.id] ?? []).forEach((r) => add(r.package_type)));
        return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [knownPackageTypes, sheets, rowsBySheet]);

    const go = (value) => router.get(urls.index, { date: value }, { preserveState: false, preserveScroll: true });
    const sheet = tab === 'summary' ? undefined : sheets.find((s) => s.type === tab && s.line === line[tab]);
    const rows = sheet ? (rowsBySheet[sheet.id] ?? []) : [];
    const gridProps = { setRows, codes: downtimeCodes, config, employeesUrl: urls.employees, packageTypes, collapsed, onToggleShift: toggleShift };

    // One workbook for the day: a sheet per main tab / sub tab, Day + Night together in a single Summary sheet.
    const exportDay = async () => {
        setExporting(true);
        try {
            const { exportWorkbook } = await import('../../hourly-monitoring/exportWorkbook');
            await exportWorkbook({ date, sheets, rowsBySheet, codes: downtimeCodes, config, urls });
        } catch (e) {
            window.alert(e?.message || 'Export failed.');
        } finally {
            setExporting(false);
        }
    };

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
                <button type="button" className="hm-btn hm-export" onClick={exportDay} disabled={exporting}>
                    {exporting ? 'Exporting…' : 'Export'}
                </button>
            </header>

            <nav className="hm-tabs" role="tablist">
                {TABS.map((t) => (
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
                            style={{ background: config.line_colors?.[lineFamily(l)] }}
                            onClick={() => setLine((prev) => ({ ...prev, [tab]: l }))}
                        >
                            {l}
                        </button>
                    ))}
                </nav>
            )}

            {tab === 'summary' && <SummaryView url={urls.summary} date={date} />}

            {tab === 'pickup' && (
                <PickupView url={urls.pickup} date={date} line={line.pickup} config={config} collapsed={collapsed} onToggleShift={toggleShift} />
            )}

            {sheet?.type === 'boxing' &&
                ['day', 'night'].map((s) => (
                    <HourlyGrid
                        key={`${sheet.id}-${s}`}
                        {...gridProps}
                        sheet={sheet}
                        shift={s}
                        title={SHIFT_TITLES[s]}
                        rows={rows.filter((r) => r.shift === s)}
                    />
                ))}

            {sheet && sheet.type !== 'boxing' && <HourlyGrid key={sheet.id} {...gridProps} sheet={sheet} rows={rows} />}
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
