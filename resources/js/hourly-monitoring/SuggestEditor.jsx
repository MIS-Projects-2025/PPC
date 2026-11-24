import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Suggestion shape: { value, label, hint?, bg?, fg? }
 */

function focusAndSelect(input) {
    input?.focus();
    input?.select();
}

/** Provided by HourlyGrid: { target([dRow, dCol]) => position | null, select(position) } */
export const CellNavContext = createContext(null);

const STEP = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

/**
 * Arrow keys in an open editor commit it and move to the neighbouring cell (Excel "enter mode").
 * F2 or a click inside the text switches to caret mode: Left / Right move the caret again.
 * `commit(focus)` closes the editor with what was typed; pass your own to accept a suggestion instead.
 */
function useCellNavigation(onClose) {
    const nav = useContext(CellNavContext);
    const caretMode = useRef(false);

    // PASTE-PATCH: a block copied from Excel (several cells) is not text for this one editor.
    // Discard the edit, close the editor and let the grid spread the block from the selected cell.
    const onPaste = (e) => {
        const text = e.clipboardData?.getData('text/plain') ?? '';
        if (!nav?.paste || !/[\t\r\n]/.test(text.replace(/[\r\n]+$/, ''))) return;
        e.preventDefault();
        e.stopPropagation();
        onClose(false, true);
        nav.paste(text);
    };

    return {
        caretProps: { onMouseDown: () => (caretMode.current = true), onPaste },
        onKeyDown(e, commit = (focus) => onClose(true, focus)) {
            if (e.key === 'F2') {
                caretMode.current = true;
                e.preventDefault();
                return;
            }
            const step = STEP[e.key];
            if (!nav || !step || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
            if (step[0] === 0 && caretMode.current) return; // Left / Right belong to the caret now

            e.preventDefault();
            e.stopPropagation();
            const target = nav.target(step);
            if (target) {
                commit(false);
                nav.select(target);
            } else {
                commit(true); // edge of the table: just commit and stay
            }
        },
    };
}

/** Plain text editor (own implementation so we don't depend on react-data-grid's editor export names). */
export function TextEditor({ row, column, onRowChange, onClose }) {
    const { onKeyDown, caretProps } = useCellNavigation(onClose);
    return (
        <input
            className="rdg-text-editor"
            ref={focusAndSelect}
            value={String(row[column.key] ?? '')}
            onChange={(e) => onRowChange({ ...row, [column.key]: e.target.value })}
            onBlur={() => onClose(true, false)}
            onKeyDown={onKeyDown}
            {...caretProps}
        />
    );
}

/**
 * Excel-style editor: type, a dropdown shows the nearest matches, ArrowUp/ArrowDown move,
 * Enter or Tab accepts the highlighted one, Esc cancels. Typing a plain value and pressing Enter
 * with no dropdown open commits it as-is.
 * Create once per grid (useMemo): a new component identity would remount the editor on every render.
 *
 * @param {Object} options
 * @param {(text: string, signal: AbortSignal) => Array | Promise<Array>} options.suggest
 * @param {(row: any, columnKey: string, suggestion: any) => any} options.pick Builds the row after a suggestion is accepted.
 * @param {number} [options.debounceMs]
 * @param {boolean} [options.autoSelect] true (default): the first match is highlighted, so Enter/Tab accepts it.
 *   false: nothing is highlighted until the user presses an arrow key / hovers, so Enter/Tab commits exactly what was
 *   typed (for free-text columns that merely *suggest*, e.g. Package Type).
 */
export function createSuggestEditor({ suggest, pick, debounceMs = 0, autoSelect = true }) {
    const initial = autoSelect ? 0 : -1;

    return function SuggestEditor({ row, column, onRowChange, onClose }) {
        const { onKeyDown: navigate, caretProps } = useCellNavigation(onClose);
        const key = column.key;
        const [text, setText] = useState(String(row[key] ?? ''));
        const [items, setItems] = useState([]);
        const [active, setActive] = useState(initial);
        const [rect, setRect] = useState(null);
        const inputRef = useRef(null);
        const activeRef = useRef(null);
        const touched = useRef(false); // no dropdown for the pre-existing value until the user types

        useLayoutEffect(() => focusAndSelect(inputRef.current), []); // typing a key on a selected cell replaces its content

        useEffect(() => {
            if (!touched.current) return;
            const controller = new AbortController();
            const timer = setTimeout(async () => {
                try {
                    const result = await suggest(text, controller.signal);
                    if (!controller.signal.aborted) {
                        setItems(result);
                        setActive(initial);
                    }
                } catch {
                    /* aborted or failed: simply no suggestions */
                }
            }, debounceMs);
            return () => {
                controller.abort();
                clearTimeout(timer);
            };
        }, [text]);

        useLayoutEffect(() => {
            if (items.length && inputRef.current) setRect(inputRef.current.getBoundingClientRect());
        }, [items]);

        useEffect(() => {
            activeRef.current?.scrollIntoView({ block: 'nearest' });
        }, [active, items]);

        const accept = (s) => onRowChange(pick(row, key, s), true);

        const onKeyDown = (e) => {
            const open = items.length > 0;
            if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                e.preventDefault();
                e.stopPropagation();
                setActive((i) => {
                    if (e.key === 'ArrowDown') return (i + 1) % items.length;
                    return i < 0 ? items.length - 1 : (i - 1 + items.length) % items.length;
                });
                return;
            }
            if (open && (e.key === 'Enter' || e.key === 'Tab') && active >= 0) {
                e.preventDefault();
                e.stopPropagation();
                accept(items[active]);
                return;
            }
            // Arrows: with a highlighted suggestion, Left / Right accept it before moving on (like Enter).
            navigate(e, open && active >= 0 ? () => accept(items[active]) : undefined);
        };

        const flipUp = rect ? rect.bottom + 260 > window.innerHeight : false;

        return (
            <>
                <input
                    className="rdg-text-editor"
                    ref={inputRef}
                    value={text}
                    onChange={(e) => {
                        touched.current = true;
                        setText(e.target.value);
                        onRowChange({ ...row, [key]: e.target.value });
                    }}
                    onKeyDown={onKeyDown}
                    {...caretProps}
                    autoComplete="off"
                />
                {items.length > 0 &&
                    rect &&
                    createPortal(
                        <ul
                            className="hm-suggest"
                            role="listbox"
                            style={{
                                left: rect.left,
                                minWidth: Math.max(rect.width, 240),
                                ...(flipUp ? { bottom: window.innerHeight - rect.top } : { top: rect.bottom }),
                            }}
                        >
                            {items.map((s, i) => (
                                <li
                                    key={s.value}
                                    ref={i === active ? activeRef : undefined}
                                    role="option"
                                    aria-selected={i === active}
                                    className={i === active ? 'is-active' : undefined}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // keep input focus
                                        accept(s);
                                    }}
                                    onMouseEnter={() => setActive(i)}
                                >
                                    {s.bg !== undefined && (
                                        <span className="hm-chip" style={{ background: s.bg ?? 'transparent' }} />
                                    )}
                                    <span className="hm-suggest-label">{s.label}</span>
                                    {s.hint && <span className="hm-suggest-hint">{s.hint}</span>}
                                </li>
                            ))}
                        </ul>,
                        document.body,
                    )}
            </>
        );
    };
}
