"""
Merge ALL matching sheets across STANDARD_LOADING_PLAN_*.xlsx files into
one workbook, one tab per distinct package-type sheet, with inconsistent
columns aligned by name.

Requires: openpyxl  (pip install openpyxl)

WHAT CHANGED FROM THE HARDCODED-LIST VERSION
---------------------------------------------
There's no more TARGET_SHEETS list to maintain by hand. Instead, every
sheet in every file is grouped automatically by its normalized name
(same idea as before: uppercase, strip anything that isn't A-Z/0-9, so
"SOT-223" and "SOT223" group together). A group only becomes an output
tab if it actually contains rows matching the Date/Item/Machine block
pattern — sheets that don't have that structure (stray analysis tabs,
"Sheet1", etc.) naturally contribute nothing and are skipped, so you
don't need to enumerate every sheet name up front.

Note this does NOT fix typos the way a hand-built list could — "LPI,LLI"
and "LPI & LLI Loading Plan" will still end up as two separate groups
unless their normalized forms happen to match. If you spot two tabs in
the output that should really be one, that's the signal to go look.

HOW EACH SHEET IS PARSED
-------------------------
Each source sheet isn't one clean table - it's a series of repeating
blocks, one per machine:

    [blank label row: machine name / area code]
    [header row: Date, Item, Machine, Part_Name, ...]
    [data rows for that machine]
    [subtotal "clear" row]
    [blank row(s)]
    [next machine's label row]
    ...

For each sheet:
  1. Walk every row, remembering the most recent header row seen
     (detected as a row starting with Date / Item / Machine).
  2. Treat a row as real data only if it has something in the
     Lot_ID-ish column - this naturally skips label rows, subtotal
     "clear" rows, and blank rows.
  3. Build each data row as a {column_name: value} dict using THAT
     block's own header text, not a fixed column list. So if a column
     moves, gets renamed slightly (e.g. "Status" vs "STATUS"), or is
     missing in some files, everything still lines up by name.
  4. Union all column names seen across all files/blocks for a given
     group into one master column order.

Duplicate column names within a single header (e.g. "Formula"
appearing many times) are kept, suffixed as "Formula (2)", "Formula (3)"
etc., rather than overwritten - so no data is silently dropped.

CONCURRENCY
-----------
Each file is parsed independently in its own worker process (one
openpyxl.load_workbook call per file, read_only+data_only - no writes,
so no risk of file corruption or lock contention between workers).
Results come back keyed by the file's original position in the sorted
file list, and are merged back together in that same order in the main
process - this keeps column ordering and row ordering deterministic
across runs, the same way the single-threaded version was, regardless
of which worker happens to finish first.

IMPORTANT: the queue for each worker is drained as soon as data is
available, not only after the worker looks dead. multiprocessing.Queue
child processes cannot fully exit until everything they put() has been
flushed through the OS pipe to the reader. If a result is larger than
the pipe buffer (easy to hit here - a sheet's worth of row dicts) and
nobody reads until is_alive() is False, the child blocks writing while
the parent waits for it to die -> deadlock. Draining opportunistically
on every poll avoids that.

CONFIGURE THE SECTION BELOW AND RUN:
    python3 merge_loading_plans.py
"""

import os
import re
import glob
from collections import OrderedDict, Counter
from queue import Empty
import time
import multiprocessing as mp
import openpyxl
from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter
FILE_TIMEOUT_SEC = 30  # kill a file's worker if it's not done by then

# ---------------------------------------------------------------------------
# 1. CONFIGURE ME
# ---------------------------------------------------------------------------

SRC_DIR = "C:/Users/telford.programmer/Documents/L O A D I N G P L A N/excel_excluded_filter_columns/OneDrive_2026-09-10 (1)/PL1 Standard Loading Plan/2026"
OUT_PATH = "C:/Users/telford.programmer/Downloads/PL1_2026_loading_plan.xlsx"
FONT = "Arial"

MAX_WORKERS = None  # None = use all available CPU cores
MAX_TASKS_PER_CHILD = 20  # Python 3.11+; set to None on older Python

# ---------------------------------------------------------------------------
# 2. SCRIPT (shouldn't need to touch this)
# ---------------------------------------------------------------------------

def _parse_file_wrapper(path, q):
    q.put(parse_file(path))

def norm_key(s):
    """'SOT-223' -> 'SOT223' — used to group sheet names loosely."""
    return re.sub(r"[^A-Z0-9]", "", str(s).upper())

def run_with_timeout(files):
    max_workers = MAX_WORKERS or (os.cpu_count() or 4)
    pending = list(enumerate(files))
    active = {}          # idx -> (process, queue, path, start_time)
    results_by_index = {}
    hung_files = []

    def launch(idx, path):
        q = mp.Queue()
        p = mp.Process(target=_parse_file_wrapper, args=(path, q))
        p.start()
        active[idx] = (p, q, path, time.time())

    while pending or active:
        while pending and len(active) < max_workers:
            idx, path = pending.pop(0)
            launch(idx, path)

        for idx in list(active):
            p, q, path, start_t = active[idx]

            # Drain any result that's ready. This is what lets a child's
            # feeder thread finish flushing a large payload to the pipe -
            # without it, we'd only read after is_alive() is False, and a
            # big-enough result blocks the child forever waiting on us
            # (see the deadlock note in the module docstring).
            if idx not in results_by_index:
                try:
                    results_by_index[idx] = q.get_nowait()
                except Empty:
                    pass

            if idx in results_by_index:
                if not p.is_alive():
                    p.join()
                    del active[idx]
                    print(f"  ({len(results_by_index)}/{len(files)} done)", flush=True)
                continue

            if not p.is_alive():
                results_by_index[idx] = (os.path.basename(path), {}, "worker died with no result")
                p.join()
                del active[idx]
                print(f"  ({len(results_by_index)}/{len(files)} done)", flush=True)
            elif time.time() - start_t > FILE_TIMEOUT_SEC:
                print(f"  !! TIMEOUT, killing: {os.path.basename(path)}", flush=True)
                p.terminate()
                p.join()
                results_by_index[idx] = (os.path.basename(path), {}, f"timed out after {FILE_TIMEOUT_SEC}s")
                hung_files.append(path)
                del active[idx]

        time.sleep(0.2)

    return [results_by_index[i] for i in range(len(files))], hung_files

def norm_header_name(s):
    """Collapse whitespace + lowercase — used to match column names loosely."""
    return re.sub(r"\s+", " ", str(s).strip()).lower()


def parse_file(path):
    """Runs in a worker process. Parses every sheet in one file, grouped
    by normalized sheet name. Returns (fname, group_results, error)."""
    fname = os.path.basename(path)
    print(f"STARTED   {fname}", flush=True)

    group_results = {}  # norm_key -> {"raw_name": str, "header_pairs": [...], "rows": [...]}

    try:
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    except Exception as e:
        return (fname, {}, f"could not open: {e}")

    for sheet_name in wb.sheetnames:
        nk = norm_key(sheet_name)
        ws = wb[sheet_name]
        header = None

        for row in ws.iter_rows(values_only=True):
            if len(row) >= 3 and row[0] == "Date" and row[1] == "Item" and row[2] == "Machine":
                header = []
                seen_names_this_header = {}
                for cell in row:
                    if cell is None:
                        header.append(None)
                        continue
                    disp = str(cell).strip()
                    hkey = norm_header_name(disp)
                    count = seen_names_this_header.get(hkey, 0) + 1
                    seen_names_this_header[hkey] = count
                    if count > 1:
                        hkey_final = f"{hkey}__dup{count}"
                        disp_final = f"{disp} ({count})"
                    else:
                        hkey_final = hkey
                        disp_final = disp
                    header.append((hkey_final, disp_final))
                continue

            if header is None:
                continue  # rows before this sheet's first header block - skip

            lot_id_idx = None
            for i, h in enumerate(header):
                if h is not None and h[0].startswith("lot_id"):
                    lot_id_idx = i
                    break

            if lot_id_idx is None or lot_id_idx >= len(row) or row[lot_id_idx] is None:
                continue  # label row, subtotal "clear" row, or blank row

            rowdict = {"Source File": fname, "Sheet Name (orig)": sheet_name}
            for i, h in enumerate(header):
                if h is None or i >= len(row):
                    continue
                hkey_final, disp_final = h
                rowdict[hkey_final] = row[i]

            entry = group_results.setdefault(
                nk, {"raw_name": sheet_name, "header_pairs": [], "rows": []}
            )
            existing_keys = {p[0] for p in entry["header_pairs"]}
            for h in header:
                if h is not None and h[0] not in existing_keys:
                    entry["header_pairs"].append(h)
                    existing_keys.add(h[0])
            entry["rows"].append(rowdict)

    return (fname, group_results, None)


def aggregate(ordered_results):
    """Merge per-file results (already in deterministic file order) into
    one dict per normalized sheet-name group."""
    groups = OrderedDict()  # norm_key -> {"raw_names": Counter, "col_order": OrderedDict, "rows": [], "files_used": int}

    for fname, group_results, err in ordered_results:
        if err:
            print(f"  ! {fname}: {err}")
            continue
        for nk, data in group_results.items():
            g = groups.setdefault(
                nk, {"raw_names": Counter(), "col_order": OrderedDict(), "rows": [], "files_used": 0}
            )
            g["raw_names"][data["raw_name"]] += 1
            for hkey_final, disp_final in data["header_pairs"]:
                if hkey_final not in g["col_order"]:
                    g["col_order"][hkey_final] = disp_final
            g["rows"].extend(data["rows"])
            g["files_used"] += 1

    return groups


def unique_sheet_title(base, used_titles):
    """Excel sheet names are capped at 31 chars; dedupe on collision."""
    title = base[:31]
    n = 2
    while title in used_titles:
        suffix = f" ({n})"
        title = base[: 31 - len(suffix)] + suffix
        n += 1
    used_titles.add(title)
    return title


def write_output(groups):
    wb = Workbook()
    wb.remove(wb.active)
    used_titles = set()

    # Stable, readable order: alphabetical by the chosen display name.
    for nk, g in sorted(groups.items(), key=lambda kv: kv[1]["raw_names"].most_common(1)[0][0].lower()):
        display_name = g["raw_names"].most_common(1)[0][0]
        col_order = g["col_order"]
        rows = g["rows"]

        fixed = ["Source File", "Sheet Name (orig)"]
        rest_keys = list(col_order.keys())
        display_names = fixed + [col_order[k] for k in rest_keys]
        key_order = fixed + rest_keys

        title = unique_sheet_title(display_name, used_titles)
        ws = wb.create_sheet(title=title)

        for c, name in enumerate(display_names, start=1):
            cell = ws.cell(row=1, column=c, value=name)
            cell.font = Font(name=FONT, bold=True)
        ws.freeze_panes = "A2"

        for r, rowdict in enumerate(rows, start=2):
            for c, key in enumerate(key_order, start=1):
                cell = ws.cell(row=r, column=c, value=rowdict.get(key))
                cell.font = Font(name=FONT)

        for c, name in enumerate(display_names, start=1):
            ws.column_dimensions[get_column_letter(c)].width = min(max(len(str(name)) + 2, 10), 30)

        print(f"{title!r}: {g['files_used']} file(s), {len(rows)} row(s), {len(display_names)} col(s)")

    wb.save(OUT_PATH)
    print("saved", OUT_PATH)


def main():
    files = sorted(
        p for p in glob.glob(f"{SRC_DIR}/**/*.xlsx", recursive=True)
        if not os.path.basename(p).startswith("~$")
    )
    print(f"{len(files)} source files found in {SRC_DIR}\n")
    if not files:
        return

    ordered_results, hung_files = run_with_timeout(files)

    if hung_files:
        print("\nSkipped (timed out) files — check these manually:")
        for f in hung_files:
            print(" ", f)

    print()
    groups = aggregate(ordered_results)
    write_output(groups)


if __name__ == "__main__":
    main()