import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Suggestion shape: { value, label, hint?, bg?, fg? }
 */

function focusAndSelect(input) {
    input?.focus();
    input?.select();
}

/** Plain text editor (own implementation so we don't depend on react-data-grid's editor export names). */
export function TextEditor({ row, column, onRowChange, onClose }) {
    return (
        <input
            className="rdg-text-editor"
            ref={focusAndSelect}
            value={String(row[column.key] ?? '')}
            onChange={(e) => onRowChange({ ...row, [column.key]: e.target.value })}
            onBlur={() => onClose(true, false)}
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
 */
export function createSuggestEditor({ suggest, pick, debounceMs = 0 }) {
    return function SuggestEditor({ row, column, onRowChange }) {
        const key = column.key;
        const [text, setText] = useState(String(row[key] ?? ''));
        const [items, setItems] = useState([]);
        const [active, setActive] = useState(0);
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
                        setActive(0);
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
            if (!items.length) return; // nothing open: let the grid handle Enter/Esc/Tab
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();
                accept(items[active]);
            }
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
