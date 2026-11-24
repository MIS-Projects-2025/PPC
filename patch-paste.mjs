#!/usr/bin/env node
/**
 * Fixes pasting a block copied from Excel into the Hourly Monitoring grids.
 *
 *   node patch-paste.mjs            (run from the project root)
 *   node patch-paste.mjs some/dir   (optional: folder that holds HourlyGrid.jsx and SuggestEditor.jsx)
 *
 * Edits HourlyGrid.jsx and SuggestEditor.jsx. Nothing is written unless every edit matches,
 * and the originals are kept as *.bak. Running it twice does nothing the second time.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2] ?? 'resources/js/hourly-monitoring';
const MARK = 'PASTE-PATCH';

/* ---------- tiny edit helpers (all throw when the anchor is not found) ---------- */

function once(src, find, replacement, label) {
    const i = src.indexOf(find);
    if (i === -1 || src.indexOf(find, i + 1) !== -1) throw new Error(`anchor not found exactly once: ${label}`);
    return src.slice(0, i) + replacement + src.slice(i + find.length);
}

function between(src, start, end, replacement, label) {
    const i = src.indexOf(start);
    const j = i === -1 ? -1 : src.indexOf(end, i);
    if (i === -1 || j === -1) throw new Error(`block not found: ${label}`);
    return src.slice(0, i) + replacement + src.slice(j + end.length);
}

function regex(src, rx, replacement, label) {
    if (!rx.test(src)) throw new Error(`pattern not found: ${label}`);
    return src.replace(rx, () => replacement);
}

/* ---------- HourlyGrid.jsx ---------- */

const PASTE_BLOCK = `// ${MARK}
    // Paste a block from Excel / Sheets: the top-left value lands in the selected cell, the rest follows right and down.
    // Read-only cells (calculated columns, names, subtotal rows) are skipped but keep their place in the block,
    // so a row copied from a sheet with the same layout lines up column for column.
    const positionOf = (row, column) => {
        const rowIdx = displayRef.current.findIndex((r) => r.id === row?.id);
        const idx = leafColumns.findIndex((c) => c.key === column?.key);
        return rowIdx < 0 || idx < 0 ? null : { idx, rowIdx };
    };

    const pasteBlock = (text, start) => {
        const lines = parseClipboard(text);
        if (!lines.length || !start || start.rowIdx < 0) return;

        const next = [...displayRef.current];
        const indexes = [];
        let line = 0;

        for (let r = start.rowIdx; r < next.length && line < lines.length; r++) {
            if (next[r].__kind) continue; // subtotal / grand total rows are skipped, not pasted over
            let row = next[r];
            lines[line].forEach((value, j) => {
                const col = leafColumns[start.idx + j];
                const canEdit = col?.renderEditCell && col.editable !== false && (typeof col.editable !== 'function' || col.editable(row));
                if (canEdit) row = { ...row, [col.key]: value };
            });
            if (row !== next[r]) {
                next[r] = row;
                indexes.push(r);
            }
            line++;
        }

        if (indexes.length) onRowsChange(next, { indexes });
    };
    pasteRef.current = pasteBlock;

    // Capture phase, so the grid's own single-cell paste never runs for it.
    // An open editor handles its own paste (useCellNavigation in SuggestEditor.jsx): plain text stays in the editor,
    // a block of several cells closes it and comes back through nav.paste.
    const onPaste = (e) => {
        if (e.target instanceof HTMLInputElement) return;
        const text = e.clipboardData?.getData('text/plain');
        const start = selected.current;
        if (!text || !start || start.rowIdx < 0) return;

        e.preventDefault();
        e.stopPropagation();
        pasteBlock(text, start);
    };`;

const ON_CELL_CLICK = `onCellClick={({ row, column }) => {
                        // ${MARK}: remember the clicked cell even if onSelectedCellChange did not report it
                        const position = positionOf(row, column);
                        if (position) selected.current = position;
                    }}
                    `;

const ON_CELL_PASTE = `onCellPaste={({ row, column }, event) => {
                        // ${MARK}: only reached when the capture handler could not place the paste (no selected cell known).
                        // Spread the clipboard block from the cell the grid reports; never while an editor input has the focus.
                        if (event?.target instanceof HTMLInputElement) return row;
                        const text = event?.clipboardData?.getData('text/plain') || clipboard.current;
                        const position = positionOf(row, column);
                        if (text && position) setTimeout(() => pasteRef.current?.(text, position), 0);
                        return row;
                    }}`;

function patchGrid(src) {
    src = once(
        src,
        `    const selected = useRef(null); // { idx, rowIdx } of the selected cell\n`,
        `    const selected = useRef(null); // { idx, rowIdx } of the selected cell\n    const pasteRef = useRef(null); // latest pasteBlock, used by the deferred paste (${MARK})\n`,
        'selected ref',
    );

    src = once(
        src,
        `            select: (position) => setTimeout(() => gridRef.current?.selectCell(position), 0),\n`,
        `            select: (position) => setTimeout(() => gridRef.current?.selectCell(position), 0),\n` +
            `            // A multi-cell paste made inside an open editor: the editor has closed itself, spread the block from the selected cell.\n` +
            `            paste: (text) =>\n` +
            `                setTimeout(() => {\n` +
            `                    if (selected.current) pasteRef.current?.(text, selected.current);\n` +
            `                }, 0),\n`,
        'nav.select',
    );

    src = between(
        src,
        '// Paste a block from Excel',
        'if (indexes.length) onRowsChange(next, { indexes });\n    };',
        PASTE_BLOCK,
        'onPaste',
    );

    src = once(src, 'onCellCopy={({ row, column }, event) => {', ON_CELL_CLICK + 'onCellCopy={({ row, column }, event) => {', 'onCellCopy');

    src = regex(src, /onCellPaste=\{\(\{ row, column \}\) =>[\s\S]*?: row\s*\}/, ON_CELL_PASTE, 'onCellPaste');

    src = once(src, 'drag the corner handle to fill', 'drag the corner handle to fill · paste a block from Excel', 'hint');

    return src;
}

/* ---------- SuggestEditor.jsx ---------- */

const EDITOR_PASTE = `
    // ${MARK}: a block copied from Excel (several cells) is not text for this one editor.
    // Discard the edit, close the editor and let the grid spread the block from the selected cell.
    const onPaste = (e) => {
        const text = e.clipboardData?.getData('text/plain') ?? '';
        if (!nav?.paste || !/[\\t\\r\\n]/.test(text.replace(/[\\r\\n]+$/, ''))) return;
        e.preventDefault();
        e.stopPropagation();
        onClose(false, true);
        nav.paste(text);
    };
`;

function patchEditor(src) {
    src = once(src, `    const caretMode = useRef(false);\n`, `    const caretMode = useRef(false);\n${EDITOR_PASTE}`, 'caretMode');
    src = once(
        src,
        'caretProps: { onMouseDown: () => (caretMode.current = true) },',
        'caretProps: { onMouseDown: () => (caretMode.current = true), onPaste },',
        'caretProps',
    );
    return src;
}

/* ---------- run: compute everything first, then write ---------- */

const plan = [
    ['HourlyGrid.jsx', patchGrid],
    ['SuggestEditor.jsx', patchEditor],
];

const results = [];

for (const [file, patch] of plan) {
    const full = path.join(DIR, file);
    if (!fs.existsSync(full)) {
        console.error(`Cannot find ${full}. Run this from the project root, or pass the folder as an argument.`);
        process.exit(1);
    }

    const raw = fs.readFileSync(full, 'utf8');
    if (raw.includes(MARK)) {
        console.log(`${file}: already patched, skipped`);
        continue;
    }

    try {
        const crlf = raw.includes('\r\n');
        const out = patch(raw.replace(/\r\n/g, '\n'));
        results.push({ full, file, raw, out: crlf ? out.replace(/\n/g, '\r\n') : out });
    } catch (e) {
        console.error(`${file}: ${e.message}\nNothing was changed.`);
        process.exit(1);
    }
}

for (const { full, file, raw, out } of results) {
    fs.writeFileSync(`${full}.bak`, raw);
    fs.writeFileSync(full, out);
    console.log(`${file}: patched (backup: ${file}.bak)`);
}

if (results.length) console.log('Done. Vite will hot-reload; if not, restart npm run dev. Delete the .bak files once you are happy.');
