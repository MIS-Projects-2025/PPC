import formatFriendlyDate from "@/Utils/formatFriendlyDate";
import clsx from "clsx";
import React, {
	forwardRef,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import DatePicker from "react-datepicker";

const SmartDatePicker = forwardRef(
	({ startDate, endDate, handleDateChange, buttonClassName }, ref) => {
		const id = useId();
		const anchorId = `--anchor-${id}`;
		const popoverId = `popover-${id}`;
		const buttonPopoverRef = useRef(null);

		useImperativeHandle(ref, () => ({
			toggle: () => buttonPopoverRef.current?.click(),
		}));

		const [selectedPreset, setSelectedPreset] = useState(null);

		const displayText = selectedPreset
			? selectedPreset
			: startDate && endDate
				? `${formatFriendlyDate(startDate.toLocaleDateString())} - ${formatFriendlyDate(endDate.toLocaleDateString())}`
				: "Select Date Range";

		const PRESETS = [
			{ label: "Today", preset: "today" },
			{ label: "Yesterday", preset: "yesterday" },
			{ label: "Last Week", preset: "last-week" },
			{ label: "This Month", preset: "this-month" },
		];

		const setPreset = (preset, label) => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			setSelectedPreset(label);

			switch (preset) {
				case "today":
					handleDateChange([today, today]);
					break;
				case "yesterday": {
					const yesterday = new Date(today);
					yesterday.setDate(today.getDate() - 1);
					handleDateChange([yesterday, yesterday]);
					break;
				}
				case "last-week": {
					const start = new Date(today);
					start.setDate(today.getDate() - today.getDay() - 7);
					const end = new Date(start);
					end.setDate(start.getDate() + 6);
					handleDateChange([start, end]);
					break;
				}
				case "this-month": {
					const start = new Date(today.getFullYear(), today.getMonth(), 1);
					const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
					handleDateChange([start, end]);
					break;
				}
			}
		};

		const handleCalendarChange = (dates) => {
			setSelectedPreset(null);
			handleDateChange(dates);
		};

		return (
			<>
				<button
					type="button"
					className={clsx("btn", buttonClassName)}
					popoverTarget={popoverId}
					style={{ anchorName: anchorId }}
					ref={buttonPopoverRef}
				>
					{displayText}
				</button>

				<ul
					className="dropdown menu rounded-box bg-base-100 shadow-sm"
					popover="auto"
					id={popoverId}
					// style={{ positionAnchor: anchorId }}
					style={{
						positionAnchor: anchorId,
						top: "anchor(bottom)",
						left: "anchor(left)",
						margin: 0,
						positionTryFallbacks: "--bottom, --top",
					}}
				>
					<li className="text-center">Select a date range</li>
					{PRESETS.map(({ label, preset }) => (
						<li>
							<a
								key={preset}
								className={`btn btn-sm rounded font-normal flex-1 ${
									selectedPreset === label ? "btn-primary" : "btn-ghost"
								}`}
								onClick={() => setPreset(preset, label)}
							>
								{label}
							</a>
						</li>
					))}
					<li>
						<DatePicker
							className="w-full rounded-lg input"
							inline
							wrapperClassName="bg-red-500"
							selected={startDate}
							onChange={handleCalendarChange}
							startDate={startDate}
							endDate={endDate}
							swapRange
							selectsRange
							isClearable
							placeholderText="Select a date range"
							dateFormat="MMM d, yyyy"
						/>
					</li>
				</ul>
			</>
		);
	},
);

export default SmartDatePicker;
