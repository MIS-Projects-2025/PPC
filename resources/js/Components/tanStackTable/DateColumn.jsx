import React from "react";
import "react-datepicker/dist/react-datepicker.css";

function normalizeInputValue(value, type) {
	if (!value) return "";

	if (type === "date") {
		return value.slice(0, 10);
	}

	return value.replace(" ", "T").slice(0, 16);
}

const DateCell = React.memo(function DateCell({
	dateType = "date",
	value,
	rowIndex,
	columnId,
	onChange,
	options = {
		showTimeSelect: true,
		timeFormat: "HH:mm",
		timeIntervals: 15,
		dateFormat: "yyyy-MM-dd HH:mm",
	},
}) {
	const date = React.useMemo(
		() => (value ? normalizeInputValue(value) : ""),
		[value],
	);

	const handleChange = React.useCallback(
		(e) => {
			let value = e.target.value;

			if (dateType === "datetime") {
				value = value ? value.replace("T", " ") + ":00" : null;
			}

			onChange(rowIndex, columnId, value);
		},
		[rowIndex, columnId, onChange, dateType],
	);

	return (
		<input
			className="input w-full font-mono mx-1"
			type={dateType === "date" ? "date" : "datetime-local"}
			value={date}
			onChange={handleChange}
		></input>
	);
});

export default DateCell;
