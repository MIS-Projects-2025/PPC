// MachineChipBase.jsx
export default function MachineChipClasses(state) {
    return `rounded-md border px-2 py-1.5 text-[11px] text-center truncate transition-colors ${
        state === "active"
            ? "ring-2 ring-info bg-info/10 border-info/40 text-info"
            : state === "disabled"
              ? "border-base-300 bg-base-200/20 text-base-content/25 cursor-not-allowed"
              : "border-base-300 bg-base-200/40 text-base-content/50"
    }`;
}
