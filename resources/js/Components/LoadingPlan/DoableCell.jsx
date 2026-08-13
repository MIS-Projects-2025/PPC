import React from "react";
import HoverCell from "./HoverCell";

// ---------------------------------------------------------------------------
// Copy shown per doableStatus. 'ok' is intentionally omitted — that case
// renders as a plain value with no popover (see DoableCell below).
// ---------------------------------------------------------------------------
const DOABLE_STATUS_COPY = {
    unknown: {
        label: "No commit found",
        description:
            "No commit exists yet for this customer, so doable can't be calculated.",
    },
    no_recipe: {
        label: "No recipe defined",
        description:
            "This item has no recipe for this customer, so doable can't be calculated.",
    },
    qty_below_recipe: {
        label: "Below recipe minimum",
        description:
            "The committed quantity is below the recipe's minimum, so doable is 0.",
    },
};

// ---------------------------------------------------------------------------
// DoableCell
// Renders the doable value, and — for any non-"ok" status — an info icon
// that reveals why the value looks the way it does on hover.
//
// Props:
//   value  — the numeric doable value (may be 0 or null)
//   status — one of 'ok' | 'unknown' | 'no_recipe' | 'qty_below_recipe'
// ---------------------------------------------------------------------------
export function DoableCell({ value, status, recipeSource }) {
    const display = value > 0 ? value.toLocaleString() : "—";

    const statusCopy = DOABLE_STATUS_COPY[status] ?? null;

    // Nothing to explain: plain "ok" with no traceable source.
    if (!statusCopy && !recipeSource) {
        return display;
    }

    return (
        <HoverCell
            trigger={
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        cursor: "help",
                        textDecoration: "underline dotted",
                        textUnderlineOffset: 3,
                        textDecorationColor: "#bbb",
                    }}
                >
                    {display}
                </span>
            }
        >
            {statusCopy && (
                <div style={{ marginBottom: recipeSource ? 8 : 0 }}>
                    <div
                        style={{
                            fontWeight: 600,
                            marginBottom: 2,
                            fontSize: 13,
                        }}
                    >
                        {statusCopy.label}
                    </div>
                    <div style={{ color: "#666", fontSize: 13 }}>
                        {statusCopy.description}
                    </div>
                </div>
            )}

            {recipeSource && (
                <div
                    style={
                        statusCopy
                            ? { borderTop: "1px solid #eee", paddingTop: 8 }
                            : undefined
                    }
                >
                    <div
                        className="text-base-100"
                        style={{
                            fontWeight: 600,
                            marginBottom: 4,
                            fontSize: 13,
                        }}
                    >
                        Recipe source
                    </div>
                    <table style={{ fontSize: 13, color: "#666" }}>
                        <tbody>
                            <tr>
                                <td style={{ paddingRight: 8, color: "#999" }}>
                                    Device
                                </td>
                                <td>{recipeSource.devicename}</td>
                            </tr>
                            <tr>
                                <td style={{ paddingRight: 8, color: "#999" }}>
                                    Recipe qty
                                </td>
                                <td>{recipeSource.recipe}</td>
                            </tr>
                            {recipeSource.packageType && (
                                <tr>
                                    <td
                                        style={{
                                            paddingRight: 8,
                                            color: "#999",
                                        }}
                                    >
                                        Package
                                    </td>
                                    <td>{recipeSource.packageType}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </HoverCell>
    );
}

// ---------------------------------------------------------------------------
// Column def usage:
//
//   import { DoableCell } from "./DoableCell";
//
//   columnHelper.accessor("Doable", {
//     header: "Doable",
//     size: 80,
//     cell: (info) => (
//       <DoableCell
//         value={info.getValue()}
//         status={info.row.original.doableStatus}
//         recipeSource={info.row.original.doableRecipeSource}
//       />
//     ),
//   }),
// ---------------------------------------------------------------------------
