import { HOUR_KEY, fmt, fmtCell, hourLabel } from './cellUtils';

const sumHours = (row, hours) => hours.reduce((t, h) => t + (Number(row[HOUR_KEY(h)]) || 0), 0);

const withTotals = (row, config) => ({
    ...row,
    day_total: sumHours(row, config.day_hours),
    night_total: sumHours(row, config.night_hours),
    all_total: sumHours(row, [...config.day_hours, ...config.night_hours]),
});

/**
 * Server lots ({ id, lot_id, part_name, package, cells }) => grid rows with one flat `h{hour}` number per slot and the
 * day / night / overall totals, followed by a read-only Grand Total row. Nothing here is ever sent back to the server.
 */
export function buildPickupRows(lots, config) {
    const hours = [...config.day_hours, ...config.night_hours];

    const rows = lots.map((lot) => {
        const row = { id: lot.id, lot_id: lot.lot_id, part_name: lot.part_name, package: lot.package ?? '' };
        for (const h of hours) row[HOUR_KEY(h)] = lot.cells?.[h] ?? '';
        return withTotals(row, config);
    });

    if (!rows.length) return rows;

    const grand = { id: 'grand', __kind: 'grand', lot_id: 'Grand Total', part_name: '', package: '' };
    for (const h of hours) {
        const sum = rows.reduce((t, r) => t + (Number(r[HOUR_KEY(h)]) || 0), 0);
        grand[HOUR_KEY(h)] = sum || '';
    }

    return [...rows, withTotals(grand, config)];
}

/** Read-only columns of the pickup table. `collapsed` ({ day, night }) hides the hour columns of a shift (see shiftGroup in columns.jsx). */
export function pickupColumns(config, collapsed = {}) {
    const hourCols = (list, shift) =>
        list.map((h) => ({
            key: HOUR_KEY(h),
            name: hourLabel(h),
            width: 96,
            resizable: true,
            cellClass: 'hm-int',
            headerCellClass: `hm-head-${shift}`,
            renderCell: ({ row }) => fmtCell(row[HOUR_KEY(h)]),
        }));

    const total = (key, name, width) => ({
        key,
        name,
        width,
        resizable: true,
        cellClass: 'hm-calc',
        renderCell: ({ row }) => fmt(row[key] ?? 0),
    });

    const group = (shift, name, list, totalCol) => ({
        name,
        headerCellClass: `hm-group-${shift}${collapsed[shift] ? ' is-collapsed' : ''}`,
        children: collapsed[shift] ? [totalCol] : [...hourCols(list, shift), totalCol],
    });

    return [
        { key: 'lot_id', name: 'LOT ID', width: 160, frozen: true, resizable: true },
        { key: 'part_name', name: 'PART NAME', width: 180, resizable: true },
        { key: 'package', name: 'PACKAGE', width: 120, resizable: true },
        group('day', 'DAY SHIFT', config.day_hours, total('day_total', 'DAY SHIFT TOTAL', 140)),
        group('night', 'NIGHT SHIFT', config.night_hours, total('night_total', 'NIGHT SHIFT TOTAL', 150)),
        { name: 'OVERALL', headerCellClass: 'hm-group-total', children: [total('all_total', 'OVERALL TOTAL', 140)] },
    ];
}
