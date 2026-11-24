import { useEffect, useState } from 'react';
import { api } from './api';
import { fmt } from './cellUtils';

function useColumns(data) {
    return [...data.columns.tnr, 'tnr', ...data.columns.fvi, 'fvi'];
}

function HeadCells({ data }) {
    const label = (key) => (key === 'tnr' || key === 'fvi' ? 'Total' : key);
    return (
        <>
            {useColumns(data).map((key) => (
                <th key={key} className={key === 'tnr' || key === 'fvi' ? 'is-total' : undefined}>
                    {label(key)}
                </th>
            ))}
        </>
    );
}

function Cells({ data, row }) {
    return (
        <>
            {useColumns(data).map((key) => (
                <td key={key} className={key === 'tnr' || key === 'fvi' ? 'is-total' : undefined}>
                    {fmt(Number(row[key] ?? 0))}
                </td>
            ))}
        </>
    );
}

function TotalsBlock({ data, highlight }) {
    return (
        <table className="hm-sum">
            <thead>
                <tr>
                    <th rowSpan={2} />
                    <th colSpan={data.columns.tnr.length + 1}>Tape and Reel</th>
                    <th colSpan={data.columns.fvi.length + 1}>FVI Outs</th>
                </tr>
                <tr>
                    <HeadCells data={data} />
                </tr>
            </thead>
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
            <thead>
                <tr>
                    <th rowSpan={2}>TIME</th>
                    <th colSpan={data.columns.tnr.length + 1}>TNR Outs</th>
                    <th colSpan={data.columns.fvi.length + 1}>FVI Outs</th>
                </tr>
                <tr>
                    <HeadCells data={data} />
                </tr>
            </thead>
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

/** Day shift on top, night shift below; each starts with the 7am-7pm / 7pm-7am / Total block. */
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
                </section>
            ))}
        </div>
    );
}
