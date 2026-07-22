import clsx from "clsx";

const CURSOR_CLASSES = {
    pointer: "cursor-pointer",
    grab: "cursor-grab active:cursor-grabbing",
    "zoom-in": "cursor-zoom-in",
    "not-allowed": "cursor-not-allowed",
};

const interactiveCursorClasses = (
    disabled,
    { cursor = "pointer", hoverText = true } = {},
) =>
    disabled
        ? "cursor-not-allowed opacity-40"
        : clsx(
              CURSOR_CLASSES[cursor],
              hoverText && "hover:text-base-content/50",
          );

export default interactiveCursorClasses;
