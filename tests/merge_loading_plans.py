"""
Merge multiple STANDARD_LOADING_PLAN_*.xlsx files into one workbook,
one tab per package type, with inconsistent columns aligned by name.

Requires: openpyxl  (pip install openpyxl)

HOW IT WORKS
------------
Each source sheet (e.g. "SOIC_N") isn't one clean table - it's a series
of repeating blocks, one per machine:

    [blank label row: machine name / area code]
    [header row: Date, Item, Machine, Part_Name, ...]
    [data rows for that machine]
    [subtotal "clear" row]
    [blank row(s)]
    [next machine's label row]
    ...

This script:
  1. Walks every row and remembers the most recent header row it saw
     (detected as a row starting with Date / Item / Machine).
  2. Treats a row as real data only if it has something in the
     Lot_ID-ish column - this naturally skips label rows, subtotal
     "clear" rows, and blank rows.
  3. Builds each data row as a {column_name: value} dict using THAT
     block's own header text, not a fixed column list. So if a
     column moves, gets renamed slightly (e.g. "Status" vs "STATUS"),
     or is missing in some files, everything still lines up by name.
  4. Unions all column names seen across all files/blocks for a given
     package type into one master column order, and writes one sheet
     per package type with all matching rows stacked underneath.

Duplicate column names within a single header (e.g. "Formula"
appearing many times) are kept, suffixed as "Formula (2)", "Formula (3)"
etc., rather than overwritten - so no data is silently dropped.

CONFIGURE THE TWO SECTIONS BELOW AND RUN:
    python3 merge_loading_plans.py
"""

import glob
import re
import datetime
from collections import OrderedDict

import openpyxl
from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

# ---------------------------------------------------------------------------
# 1. CONFIGURE ME
# ---------------------------------------------------------------------------

SRC_DIR = "C:/Users/telford.programmer/Downloads/tray_turret_excels/half-1"          # folder containing all the .xlsx files to merge
OUT_PATH = "C:/Users/telford.programmer/Downloads/tray_turret_half_1.xlsx"
FONT = "Arial"

# Which sheet(s) to pull from each source file, and what to call the
# combined tab. Keys = output tab name. Values = list of "normalized"
# sheet-name variants that should all be treated as the same sheet
# (handles things like "LPI,LLI" vs "LPI & LLI Loading Plan").
#
# Normalization = uppercase, strip everything that isn't A-Z or 0-9.
# e.g. "PDIP & PLCC" -> "PDIPPLCC", "SOT-223" -> "SOT223"
# TARGET_SHEETS = OrderedDict([
#     ("SOIC_N",      ["SOICN"]),
#     ("MSOP",        ["MSOP"]),
#     ("TSSOP",       ["TSSOP"]),
#     ("SOIC_W",      ["SOICW"]),
#     ("PDIP & PLCC", ["PDIPPLCC"]),
#     ("DDPAK",       ["DDPAK"]),
#     ("SOT-223",     ["SOT223"]),
#     ("MPD",         ["MPD"]),
#     ("LPI,LLI",     ["LPILLI", "LPILLILOADINGPLAN"]),
#     ("LDCC",        ["LDCC"]),
# ])

TARGET_SHEETS = OrderedDict([
    ("LFCSP",      ["LFCSP"]),
    ("QFP LGA LCC BGA",        ["QFPLGALCCBGA"]),
    ("DFN-QFN",       ["DFN-QFN"]),
    ("SC70 SOT & TSOT",      ["SC70SOTTSOT"]),
    ("TO-220", ["TO-220"]),
    ("TO-92",       ["TO-92"]),
    ("TO-46",     ["TO-46"]),
    ("TO-5",         ["TO-5"]),
    ("TO-39",     ["TO-39"]),
])

# ---------------------------------------------------------------------------
# 2. SCRIPT (shouldn't need to touch this)
# ---------------------------------------------------------------------------


def norm_key(s):
    """'SOT-223' -> 'SOT223' — used to match sheet names loosely."""
    return re.sub(r"[^A-Z0-9]", "", str(s).upper())


def norm_header_name(s):
    """Collapse whitespace + lowercase — used to match column names loosely."""
    return re.sub(r"\s+", " ", str(s).strip()).lower()


def find_sheet(wb, wanted_norms):
    for name in wb.sheetnames:
        if norm_key(name) in wanted_norms:
            return name
    return None


def parse_all():
    files = sorted(glob.glob(f"{SRC_DIR}/*.xlsx"))
    print(f"{len(files)} source files found in {SRC_DIR}")

    results = {}  # target_label -> {"col_order": OrderedDict, "rows": [dict, ...], "files_used": int}

    for target_label, wanted_norms in TARGET_SHEETS.items():
        col_order = OrderedDict()  # norm_col_name -> display_name (insertion order = column order)
        all_rows = []
        files_used = 0

        for path in files:
            fname = path.split("/")[-1]
            try:
                wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
            except Exception as e:
                print(f"  ! could not open {fname}: {e}")
                continue

            sheet_name = find_sheet(wb, wanted_norms)
            if sheet_name is None:
                continue
            files_used += 1
            ws = wb[sheet_name]

            header = None  # list of (norm_name, display_name) per column index, or None per cell
            for row in ws.iter_rows(values_only=True):
                if len(row) >= 3 and row[0] == "Date" and row[1] == "Item" and row[2] == "Machine":
                    # This is a header row for a new machine block.
                    header = []
                    seen_names_this_header = {}
                    for cell in row:
                        if cell is None:
                            header.append(None)
                            continue
                        disp = str(cell).strip()
                        nkey = norm_header_name(disp)
                        count = seen_names_this_header.get(nkey, 0) + 1
                        seen_names_this_header[nkey] = count
                        if count > 1:
                            nkey_final = f"{nkey}__dup{count}"
                            disp_final = f"{disp} ({count})"
                        else:
                            nkey_final = nkey
                            disp_final = disp
                        header.append((nkey_final, disp_final))
                        if nkey_final not in col_order:
                            col_order[nkey_final] = disp_final
                    continue

                if header is None:
                    continue  # rows before the very first header block - skip

                # Find the Lot_ID-ish column for this block's header.
                lot_id_idx = None
                for i, h in enumerate(header):
                    if h is not None and h[0].startswith("lot_id"):
                        lot_id_idx = i
                        break

                if lot_id_idx is None or lot_id_idx >= len(row) or row[lot_id_idx] is None:
                    # No Lot_ID -> this is a label row, subtotal "clear" row, or blank row.
                    continue

                rowdict = {"Source File": fname, "Sheet Name (orig)": sheet_name}
                for i, h in enumerate(header):
                    if h is None or i >= len(row):
                        continue
                    nkey_final, disp_final = h
                    rowdict[nkey_final] = row[i]
                all_rows.append(rowdict)

        results[target_label] = {"col_order": col_order, "rows": all_rows, "files_used": files_used}
        print(f"{target_label}: {files_used} files, {len(all_rows)} data rows, {len(col_order)} distinct columns")

    return results


def write_output(results):
    wb = Workbook()
    wb.remove(wb.active)

    for target_label, data in results.items():
        col_order = data["col_order"]
        rows = data["rows"]

        fixed = ["Source File", "Sheet Name (orig)"]
        rest_keys = list(col_order.keys())
        display_names = fixed + [col_order[k] for k in rest_keys]
        key_order = fixed + rest_keys

        ws = wb.create_sheet(title=target_label[:31])  # Excel sheet-name length limit

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

        print(f"{target_label}: wrote {len(rows)} rows, {len(display_names)} cols")

    wb.save(OUT_PATH)
    print("saved", OUT_PATH)


if __name__ == "__main__":
    results = parse_all()
    write_output(results)
