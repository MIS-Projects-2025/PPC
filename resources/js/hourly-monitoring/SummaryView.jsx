import { Fragment, useEffect, useState } from 'react';
import { api } from './api';
import { fmt } from './cellUtils';

/** F1 / F2 / F3 columns carry their pale color (server-provided); everything else keeps the default header. */
const tint = (item) => (item.color ? { background: item.color, color: '#1a1a1a' } : undefined);

/** Two header rows: group titles, then one column per family + the group's Total. */
function Head({ data, corner, titleKey }) {
    return (
        <thead>
            <tr>
                <th rowSpan={2}>{corner}</th>
                {data.groups.map((g) => (
                    <th key={g.key} colSpan={g.columns.length + 1}>
                        {g[titleKey]}
                    </th>
                ))}
            </tr>
            <tr>
                {data.groups.map((g) => (
                    <Fragment key={g.key}>
                        {g.columns.map((c) => (
                            <th key={c.key} style={tint(c)}>
                                {c.label}
                            </th>
                        ))}
                        <th className="is-total">Total</th>
                    </Fragment>
                ))}
            </tr>
        </thead>
    );
}

function Cells({ data, row }) {
    return (
        <>
            {data.groups.map((g) => (
                <Fragment key={g.key}>
                    {g.columns.map((c) => (
                        <td key={c.key}>{fmt(Number(row[c.key] ?? 0))}</td>
                    ))}
                    <td className="is-total">{fmt(Number(row[g.key] ?? 0))}</td>
                </Fragment>
            ))}
        </>
    );
}

function TotalsBlock({ data, highlight }) {
    return (
        <table className="hm-sum">
            <Head data={data} corner="" titleKey="label" />
            <tbody>
                {data.totals.map((row) => (
                    <tr key={row.label} className={row.label === highlight ? 'is-current' : undefined}>
                        <th scope="row">{row.label}</th>
                        <Cells data={data} row={row} />
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function HourlyBlock({ data, shift }) {
    const block = data.shifts[shift];
    return (
        <table className="hm-sum">
            <Head data={data} corner="TIME" titleKey="hourly_label" />
            <tbody>
                {block.rows.map((row) => (
                    <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        <Cells data={data} row={row} />
                    </tr>
                ))}
                <tr className="is-sum">
                    <th scope="row">TOTAL</th>
                    <Cells data={data} row={block.total} />
                </tr>
            </tbody>
        </table>
    );
}

/** Per-line tables with the hours across: TNR (STD + TRAY per family), Boxing, FVI. */
function DetailSection({ section, hours }) {
    return (
        <div className="hm-detail">
            <h3>{section.title}</h3>
            {section.blocks.map((block, i) => (
                <div className="hm-sum-scroll" key={i}>
                    <table className="hm-sum">
                        <thead>
                            <tr>
                                <th />
                                {hours.map((h) => (
                                    <th key={h}>{h}</th>
                                ))}
                                <th className="is-total">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {block.rows.map((row) => (
                                <tr key={row.label}>
                                    <th scope="row" style={tint(row)}>
                                        {row.label}
                                    </th>
                                    {row.values.map((v, j) => (
                                        <td key={j}>{fmt(v)}</td>
                                    ))}
                                    <td className="is-total">{fmt(row.total)}</td>
                                </tr>
                            ))}
                            <tr className="is-sum">
                                <th scope="row">{block.total.label}</th>
                                {block.total.values.map((v, j) => (
                                    <td key={j}>{fmt(v)}</td>
                                ))}
                                <td>{fmt(block.total.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}

/** Day shift on top, night shift below; each starts with the 7am-7pm / 7pm-7am / Total block, then the hourly table and the per-line tables. */
export default function SummaryView({ url, date }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        setData(null);
        api(`${url}?date=${encodeURIComponent(date)}`, { signal: controller.signal })
            .then(setData)
            .catch((e) => !controller.signal.aborted && setError(e.message));
        return () => controller.abort();
    }, [url, date]);

    if (error) return <div className="hm-error">{error}</div>;
    if (!data) return <div className="hm-empty">Loading summary…</div>;

    return (
        <div className="hm-summary">
            {['day', 'night'].map((shift) => (
                <section key={shift}>
                    <h2>{shift === 'day' ? 'Day shift (7am–7pm)' : 'Night shift (7pm–7am)'}</h2>
                    <div className="hm-sum-scroll">
                        <TotalsBlock data={data} highlight={data.shifts[shift].label} />
                    </div>
                    <div className="hm-sum-scroll">
                        <HourlyBlock data={data} shift={shift} />
                    </div>
                    {data.shifts[shift].detail.map((section) => (
                        <DetailSection key={section.key} section={section} hours={data.shifts[shift].hours} />
                    ))}
                </section>
            ))}
        </div>
    );
}
