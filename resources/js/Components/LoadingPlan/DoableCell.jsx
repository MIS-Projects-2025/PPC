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
                <span className="inline-flex items-center gap-1 cursor-help underline decoration-dotted underline-offset-[3px] decoration-base-content/40">
                    {display}
                </span>
            }
        >
            <div className="text-xs font-mono rounded-lg text-base-100 space-y-2 min-w-[180px] text-left">
                {statusCopy && (
                    <div className={recipeSource ? "mb-2" : ""}>
                        <div className="font-semibold text-xs mb-0.5 text-base-100">
                            {statusCopy.label}
                        </div>
                        <div className="text-xs text-base-100/70">
                            {statusCopy.description}
                        </div>
                    </div>
                )}

                {recipeSource && (
                    <div
                        className={
                            statusCopy
                                ? "border-t border-base-content/15 pt-2"
                                : ""
                        }
                    >
                        <div className="font-semibold text-xs mb-1 text-primary">
                            Recipe source
                        </div>
                        <table className="text-xs text-base-100/80 border-separate border-spacing-y-0.5">
                            <tbody>
                                <tr>
                                    <td className="pr-3 text-base-100/50 font-normal">
                                        Device
                                    </td>
                                    <td className="font-medium text-base-100">
                                        {recipeSource.devicename}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="pr-3 text-base-100/50 font-normal">
                                        Recipe qty
                                    </td>
                                    <td className="font-medium text-base-100">
                                        {recipeSource.recipe}
                                    </td>
                                </tr>
                                {recipeSource.packageType && (
                                    <tr>
                                        <td className="pr-3 text-base-100/50 font-normal">
                                            Package
                                        </td>
                                        <td className="font-medium text-base-100">
                                            {recipeSource.packageType}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
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
//         status={info.row.original.doable_status}
//         recipeSource={info.row.original.doable_recipe_source}
//       />
//     ),
//   }),
// ---------------------------------------------------------------------------
