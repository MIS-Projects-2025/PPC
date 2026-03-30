import { FACTORY_COLORS } from "@/Constants/colors";
import { periodOptions } from "@/Constants/periodOptions";
import {
	TOGGLE_FACTORY_BUTTONS,
	TOGGLE_OUT_TOTAL_BUTTONS,
	TOGGLE_WIP_TOTAL_BUTTONS,
} from "@/Constants/toggleButtons";
import { useFetch } from "@/Hooks/useFetch";
import { useSelectedFilteredStore } from "@/Store/selectedFilterStore";
import { useWorkweekStore } from "@/Store/workweekListStore";
import capitalizeFirstLetter from "@/Utils/capitalizeFirstLetter";
import { visibleLines as chartLines } from "@/Utils/chartLines";
import formatDate from "@/Utils/formatDate";
import formatFriendlyDate from "@/Utils/formatFriendlyDate";
import {
	formatPeriodLabel,
	formatPeriodTrendMessage,
} from "@/Utils/formatStatusMessage";
import { router } from "@inertiajs/react";
import clsx from "clsx";
import React, { memo, useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import TableChart from "./Charts/TableChart";
import TrendLineChart from "./Charts/TrendLineChart";
import FloatingLabelInput from "./FloatingLabelInput";
import MultiSelectSearchableDropdown from "./MultiSelectSearchableDropdown";
import TogglerButton from "./TogglerButton";

const TrendByPackage = memo(function TrendByPackage({
	isVisible,
	packageName = null,
	noChartTable = false,
	routeApi = "api.wip.overallByPackage",
	disableBodySizeView = false,
	trendType = "wip",
}) {
	const {
		workWeeks: savedWorkWeeks,
		lookBack: savedLookBack,
		period: savedPeriod,
		offset: savedOffset,
		startDate: savedStartDate,
		endDate: savedEndDate,
		setSelectedWorkWeeks: setSavedWorkWeeks,
		setSelectedPackageNames: setSavedSelectedPackageNames,
		setSelectedLookBack: setSavedSelectedLookBack,
		setSelectedPeriod: setSavedSelectedPeriod,
		setSelectedOffset: setSavedSelectedOffset,
		setSelectedStartDate: setSavedStartDate,
		setSelectedEndDate: setSavedEndDate,
	} = useSelectedFilteredStore();
	const [selectPeriod, setSelectedPeriod] = useState(savedPeriod || "weekly");
	const [selectedLookBack, setSelectedLookBack] = useState(savedLookBack || 20);
	const [selectedOffsetPeriod, setSelectedOffsetPeriod] = useState(
		savedOffset || 0,
	);
	const [selectedWorkWeeks, setSelectedWorkWeek] = useState(
		savedWorkWeeks || [],
	);
	const [visibleLines, setVisibleLines] = useState({
		totalLots: true,
		totalQuantity: true,
	});

	const [startDate, setStartDate] = useState(savedStartDate);
	const [endDate, setEndDate] = useState(savedEndDate);

	const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;

	const {
		data: workWeekData,
		isLoading: isWorkWeekLoading,
		errorMessage: WorkWeekErrorMessage,
	} = useWorkweekStore();

	const toggleLine = (name, key) => {
		setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const params = {
		packageName: packageName,
		period: selectPeriod,
		dateRange: dateRange,
		lookBack: selectedLookBack,
		offsetDays: selectedOffsetPeriod,
		workweek: selectedWorkWeeks.join(","),
	};

	const handleDateChange = (dates) => {
		const [start, end] = dates;
		setStartDate(start);
		setEndDate(end);

		if (!start || !end) return;
		setSavedStartDate(start);
		setSavedEndDate(end);
	};

	const {
		data: overallByPackageTrendData,
		isLoading: isOveraByPackagellTrendLoading,
		errorMessage: overallByPackageTrendErrorMessage,
		fetch: overallByPackageTrendFetch,
	} = useFetch(route(routeApi), {
		params: params,
		auto: false,
	});

	const xAxis = "label";

	useEffect(() => {
		if (packageName === null) return;
		if (!startDate || !endDate) return;

		const fetchData = async () => {
			await overallByPackageTrendFetch();
		};

		fetchData();
	}, [
		selectPeriod,
		selectedLookBack,
		selectedOffsetPeriod,
		packageName,
		selectedWorkWeeks,
		startDate,
		endDate,
	]);

	const datePeriod = formatPeriodLabel(selectPeriod);

	const fullLabel = formatPeriodTrendMessage(
		overallByPackageTrendData,
		isOveraByPackagellTrendLoading,
		selectPeriod,
		selectedLookBack,
		selectedOffsetPeriod,
		selectedWorkWeeks,
	);

	const lines = useMemo(
		() =>
			chartLines({
				showQuantities: visibleLines.totalQuantity && trendType === "wip",
				showOuts: visibleLines.totalQuantity && trendType === "out",
				showLots: visibleLines.totalLots,
				showFactories: { f1: true, f2: true, f3: true, overall: true },
				keyLines: FACTORY_COLORS,
			}),
		[visibleLines],
	);

	const handleViewBodySizeChart = () => {
		setSavedSelectedPackageNames([packageName]);
		router.visit(route("bodySize", packageName));
	};

	return (
		<div
			className={`border rounded-lg border-base-content/10 transition-all duration-300 ease-in-out transform origin-top ${
				isVisible
					? "opacity-100 p-4 scale-100"
					: "opacity-0 scale-95 max-h-0 overflow-hidden"
			}`}
		>
			<div className="divider">
				<span className="text-md">
					{capitalizeFirstLetter(trendType)} Trend{" "}
					<span className="bg-primary/50 px-4 rounded-lg">{packageName}</span>
				</span>
			</div>
			<div className="flex items-center gap-x-2 gap-y-4 flex-wrap">
				<div className="join items-center">
					<span className="pr-2 btn btn-disabled join-item bg-red-500">
						period
					</span>

					<button
						type="button"
						className="join-item btn rounded-r-lg border-base-content/10 w-20"
						popoverTarget="popover-period"
						style={{ anchorName: "--anchor-period" }}
					>
						{selectPeriod}
					</button>

					<ul
						className="dropdown menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm"
						popover="auto"
						id="popover-period"
						style={{ positionAnchor: "--anchor-period" }}
					>
						{periodOptions.map((option) => (
							<li key={option.value}>
								<a
									onClick={() => {
										setSelectedPeriod(option.value);
										setSavedSelectedPeriod(option.value);
									}}
								>
									{option.label}
								</a>
							</li>
						))}
					</ul>
				</div>

				<div className={clsx("flex", selectPeriod === "daily" ? "" : "hidden")}>
					<DatePicker
						className="w-full rounded-lg input z-50"
						selected={startDate}
						onChange={handleDateChange}
						startDate={startDate}
						endDate={endDate}
						selectsRange
						isClearable
						placeholderText="Select a date range"
						dateFormat="MMM d, yyyy"
					/>
				</div>

				<div
					className={clsx(
						"flex",
						selectPeriod === "weekly" || selectPeriod === "daily"
							? "hidden"
							: "",
					)}
				>
					<FloatingLabelInput
						id="lookBack"
						label={`Look back ${datePeriod}`}
						value={selectedLookBack}
						type="number"
						onChange={(e) => {
							setSelectedLookBack(e.target.value);
							setSavedSelectedLookBack(e.target.value);
						}}
						className="h-9 m-1 w-34"
						labelClassName="bg-base-300"
					/>
					<FloatingLabelInput
						id="offset"
						label={`Offset days`}
						value={selectedOffsetPeriod}
						type="number"
						onChange={(e) => {
							setSelectedOffsetPeriod(Number(e.target.value));
							setSavedSelectedOffset(Number(e.target.value));
						}}
						className="h-9 m-1 w-34"
						labelClassName="bg-base-300"
						alwaysFloatLabel
					/>
				</div>

				<div className={clsx(selectPeriod === "weekly" ? "" : "hidden")}>
					<MultiSelectSearchableDropdown
						options={
							workWeekData?.data.map((item) => ({
								value: String(item.cal_workweek),
								label: `${formatFriendlyDate(
									item.startDate,
								)} - ${formatFriendlyDate(item.endDate)}`,
							})) || []
						}
						defaultSelectedOptions={selectedWorkWeeks}
						onChange={(value) => {
							setSelectedWorkWeek(value);
							setSavedWorkWeeks(value);
						}}
						isLoading={isWorkWeekLoading}
						itemName="Workweek List"
						prompt="Select Workweek"
						debounceDelay={500}
						contentClassName="w-72 h-120"
					/>
				</div>

				<TogglerButton
					toggleButtons={
						trendType === "wip"
							? TOGGLE_WIP_TOTAL_BUTTONS
							: TOGGLE_OUT_TOTAL_BUTTONS
					}
					visibleBars={visibleLines}
					toggleBar={toggleLine}
					buttonClassName="h-8"
				/>

				{!disableBodySizeView && (
					<button
						type="button"
						className="btn btn-secondary"
						onClick={handleViewBodySizeChart}
					>
						view body size dissection
					</button>
				)}
			</div>
			<div className="text-sm opacity-80">{fullLabel}</div>
			<div className="w-full">
				<TrendLineChart
					data={overallByPackageTrendData?.data || []}
					xKey={xAxis}
					isLoading={isOveraByPackagellTrendLoading}
					errorMessage={overallByPackageTrendErrorMessage}
					lines={lines}
				/>
			</div>
		</div>
	);
});

export default TrendByPackage;
