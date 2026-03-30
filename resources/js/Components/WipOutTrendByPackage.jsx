import { WIP_OUT_PL_SIZE } from "@/Constants/colors";
import { periodOptions } from "@/Constants/periodOptions";
import {
	plColumnGroups,
	plPreferredOrder,
} from "@/Constants/trendTableColumnOrder";
import { useDownloadFile } from "@/Hooks/useDownload";
import { useFetch } from "@/Hooks/useFetch";
import { useF1F2PackagesStore } from "@/Store/f1f2PackageListStore";
import { useSelectedFilteredStore } from "@/Store/selectedFilterStore";
import { useWorkweekStore } from "@/Store/workweekListStore";
import { visibleLines } from "@/Utils/chartLines";
import formatDate from "@/Utils/formatDate";
import formatFriendlyDate from "@/Utils/formatFriendlyDate";
import {
	formatPeriodLabel,
	formatPeriodTrendMessage,
} from "@/Utils/formatStatusMessage";
import clsx from "clsx";
import { subDays } from "date-fns";
import { useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import CancellableActionButton from "./CancellableActionButton";
import StackedBarChart from "./Charts/StackedBarChart";
import TableChart from "./Charts/TableChart";
import TrendLineChart from "./Charts/TrendLineChart";
import FloatingLabelInput from "./FloatingLabelInput";
import MultiSelectSearchableDropdown from "./MultiSelectSearchableDropdown";
import Tabs from "./Tabs";
import TogglerButton from "./TogglerButton";

const test = ["F1", "F2", "F3", "Overall"];

const WipOutTrendByPackage = ({
	isVisible,
	title = "",
	dataAPI = null,
	showWIPLines = {},
	showPLLines = {},
	noChartTable = false,
	downloadRoute = null,
}) => {
	const {
		download,
		isLoading,
		errorMessage,
		abort: abortDownload,
	} = useDownloadFile();

	const {
		packageNames: savedSelectedPackageNames,
		workWeeks: savedWorkWeeks,
		lookBack: savedLookBack,
		offset: savedOffset,
		period: savedPeriod,
		factory: savedFactory,
		startDate: savedStartDate,
		endDate: savedEndDate,
		setSelectedPackageNames: setSavedSelectedPackage,
		setSelectedWorkWeeks: setSavedWorkWeeks,
		setSelectedLookBack: setSavedSelectedLookBack,
		setSelectedPeriod: setSavedSelectedPeriod,
		setSelectedOffset: setSavedSelectedOffset,
		setSelectedFactory: setSavedSelectedFactory,
		setSelectedStartDate: setSavedStartDate,
		setSelectedEndDate: setSavedEndDate,
	} = useSelectedFilteredStore();

	const [selectedPackageNames, setSelectedPackageNames] = useState(
		savedSelectedPackageNames,
	);
	const [selectedWorkWeeks, setSelectedWorkWeeks] = useState(savedWorkWeeks);
	const [selectedLookBack, setSelectedLookBack] = useState(savedLookBack);
	const [selectedOffsetPeriod, setSelectedOffsetPeriod] = useState(savedOffset);
	const [selectPeriod, setSelectedPeriod] = useState(savedPeriod);
	const [selectedFactory, setSelectedFactory] = useState(savedFactory);
	const [activePLs, setActivePLs] = useState(new Set(["pl1", "pl6"]));
	const [plActiveTotals, setPlActiveTotals] = useState(new Set(["total_wip"]));
	const [startDate, setStartDate] = useState(savedStartDate);
	const [endDate, setEndDate] = useState(savedEndDate);

	const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;

	const params = {
		packageName: selectedPackageNames.join(","),
		period: selectPeriod,
		dateRange: dateRange,
		lookBack: selectedLookBack,
		offsetDays: selectedOffsetPeriod,
		workweek: selectedWorkWeeks.join(","),
	};

	const handleDownloadClick = () => {
		const today = new Date();

		const offsetDate = subDays(today, selectedOffsetPeriod);

		const startDate = subDays(offsetDate, selectedLookBack - 1);
		const endDate = offsetDate; // end date is the offset date

		download(route(downloadRoute), {
			packageName: selectedPackageNames.join(","),
			period: selectPeriod,
			dateRange: dateRange,
			offsetDays: selectedOffsetPeriod,
			lookBack: selectedLookBack,
		});
	};

	const {
		data: workWeekData,
		isLoading: isWorkWeekLoading,
		errorMessage: WorkWeekErrorMessage,
	} = useWorkweekStore();

	const {
		data: packagesData,
		isLoading: isPackagesLoading,
		errorMessage: packagesErrorMessage,
	} = useF1F2PackagesStore();

	const {
		data: overallByPackageWipData,
		isLoading: isOveraByPackagellWipLoading,
		errorMessage: overallByPackageWipErrorMessage,
		fetch: overallByPackageWipFetch,
		abort: overallByPackageWipAbort,
	} = useFetch(dataAPI, {
		params: params,
		auto: false,
	});

	const handlePackageNamesChange = (selectedPackages) => {
		setSelectedPackageNames(selectedPackages);
		setSavedSelectedPackage(selectedPackages);
	};

	const handleFactoryChange = (selectedFactory) => {
		setSelectedFactory(selectedFactory);
		setSavedSelectedFactory(selectedFactory);
	};

	const handleWorkWeekChange = (selectedWorkWeek) => {
		setSelectedWorkWeeks(selectedWorkWeek);
		setSavedWorkWeeks(selectedWorkWeek);
	};

	const handleLookBackChange = (selectedLookBack) => {
		setSelectedLookBack(selectedLookBack);
		setSavedSelectedLookBack(selectedLookBack);
	};

	const handlePeriodChange = (selectedPeriod) => {
		setSelectedPeriod(selectedPeriod);
		setSavedSelectedPeriod(selectedPeriod);
	};

	const handleOffsetChange = (selectedOffsetPeriod) => {
		setSelectedOffsetPeriod(selectedOffsetPeriod);
		setSavedSelectedOffset(selectedOffsetPeriod);
	};

	const xAxis = "label";

	const handleSearch = async () => {
		if (selectedPackageNames === null) return;

		await overallByPackageWipFetch(params);
	};

	const datePeriod = formatPeriodLabel(selectPeriod);

	const fullLabel = formatPeriodTrendMessage(
		overallByPackageWipData,
		isOveraByPackagellWipLoading,
		selectPeriod,
		selectedLookBack,
		selectedOffsetPeriod,
		selectedWorkWeeks,
	);

	const disableSearch =
		(selectPeriod === "weekly" && selectedWorkWeeks.length === 0) ||
		startDate === null ||
		endDate === null;

	const lines = useMemo(
		() =>
			visibleLines({
				showFactories: {
					f1: selectedFactory === "F1",
					f2: selectedFactory === "F2",
					f3: selectedFactory === "F3",
					overall: selectedFactory === "Overall",
				},
				...showWIPLines,
			}),
		[selectedFactory],
	);

	const plLines = useMemo(
		() =>
			visibleLines({
				showFactories: {
					f1: selectedFactory === "F1",
					f2: selectedFactory === "F2",
					f3: selectedFactory === "F3",
					overall: selectedFactory === "Overall",
				},
				...showPLLines,
			}),
		[selectedFactory],
	);

	const overallBars = useMemo(
		() =>
			visibleLines({
				showFactories: {
					f1: selectedFactory === "F1",
					f2: selectedFactory === "F2",
					f3: selectedFactory === "F3",
					overall: selectedFactory === "Overall",
				},
				showBuckets: true,
				showQuantities: true,
				showOuts: true,
				showLots: true,
				showPLWip: false,
				keyLines: WIP_OUT_PL_SIZE,
			}),
		[selectedFactory],
	);

	const visibleOverAllBars = overallBars.reduce(
		(acc, b) => ({ ...acc, [b.visibilityKey]: true }),
		{},
	);

	const plBars = useMemo(
		() =>
			visibleLines({
				showFactories: {
					f1: selectedFactory === "F1",
					f2: selectedFactory === "F2",
					f3: selectedFactory === "F3",
					overall: selectedFactory === "Overall",
				},
				showBuckets: true,
				showPLWip: true,
				showPLOut: true,
				showPL1: activePLs.has("pl1"),
				showPL6: activePLs.has("pl6"),
				showQuantities: plActiveTotals.has("total_wip"),
				showOuts: plActiveTotals.has("total_outs"),
				showLots: plActiveTotals.has("total_lots"),
				keyLines: WIP_OUT_PL_SIZE,
			}),
		[selectedFactory, activePLs, plActiveTotals],
	);

	const visiblePlBars = plBars.reduce(
		(acc, b) => ({ ...acc, [b.visibilityKey]: true }),
		{},
	);

	const handleDateChange = (dates) => {
		const [start, end] = dates;
		setStartDate(start);
		setEndDate(end);

		if (!start || !end) return;
		setSavedStartDate(start);
		setSavedEndDate(end);
	};

	const chartTitle = (suffix) => {
		const packages =
			selectedPackageNames.length > 3
				? `${selectedPackageNames.slice(0, 3).join(", ")} +${selectedPackageNames.length - 3} more`
				: selectedPackageNames.join(", ") || "All Packages";
		return `${packages} · ${selectedFactory} ${suffix}`;
	};

	return (
		<>
			<div className="mb-2">{title}</div>
			<Tabs
				options={test}
				selectedFactory={selectedFactory}
				handleFactoryChange={handleFactoryChange}
			/>

			<div
				className={`border rounded-lg border-base-content/10 transition-all duration-300 ease-in-out transform origin-top ${
					isVisible
						? "opacity-100 p-4 scale-100"
						: "opacity-0 scale-95 max-h-0 overflow-hidden"
				}`}
			>
				<div className="flex items-center gap-x-2 gap-y-4 flex-wrap">
					<MultiSelectSearchableDropdown
						options={
							packagesData?.data.map((opt) => ({
								value: opt,
								label: null,
							})) || []
						}
						onChange={handlePackageNamesChange}
						defaultSelectedOptions={selectedPackageNames}
						isLoading={isPackagesLoading}
						itemName="Package List"
						prompt="Select packages"
						contentClassName="w-200 h-70"
					/>

					<div className="join items-center">
						<span className="join-item btn btn-disabled font-medium">
							Period
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
											handlePeriodChange(option.value);
										}}
									>
										{option.label}
									</a>
								</li>
							))}
						</ul>
					</div>

					<div
						className={clsx("flex", selectPeriod === "daily" ? "" : "hidden")}
					>
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
							onChange={(e) => handleLookBackChange(Number(e.target.value))}
							className="h-9 m-1 w-34"
							labelClassName="bg-base-200"
						/>

						<FloatingLabelInput
							id="offset"
							label={`Offset days`}
							value={selectedOffsetPeriod}
							type="number"
							onChange={(e) => handleOffsetChange(Number(e.target.value))}
							className="h-9 m-1 w-34"
							labelClassName="bg-base-200"
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
								handleWorkWeekChange(value);
							}}
							isLoading={isWorkWeekLoading}
							itemName="Workweek List"
							prompt="Select Workweek"
							debounceDelay={500}
							contentClassName="w-200 h-80"
						/>
					</div>

					<CancellableActionButton
						abort={overallByPackageWipAbort}
						refetch={handleSearch}
						loading={isOveraByPackagellWipLoading}
						disabled={disableSearch}
					/>

					{downloadRoute && (
						<CancellableActionButton
							abort={abortDownload}
							refetch={handleDownloadClick}
							loading={isLoading}
							buttonText="download"
							loadingMessage="downloading"
							buttonClassName="btn-accent"
						/>
					)}

					{errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
				</div>
				<div className="text-sm opacity-80">{fullLabel}</div>
				<div className="w-full">
					<TrendLineChart
						data={overallByPackageWipData?.data || []}
						xKey={xAxis}
						isLoading={isOveraByPackagellWipLoading}
						errorMessage={overallByPackageWipErrorMessage}
						lines={lines}
						syncId={"dashboard-trend"}
						title={chartTitle("WIP & Outs")}
						rightAxisTickFormatter={(value) => `${value.toFixed(2)}%`}
					/>
					<TrendLineChart
						data={overallByPackageWipData?.pl_data || []}
						xKey={xAxis}
						isLoading={isOveraByPackagellWipLoading}
						errorMessage={overallByPackageWipErrorMessage}
						lines={plLines}
						title={chartTitle("PL Overview")}
						syncId={"dashboard-trend"}
					/>
					{/* Chart 1 — overall WIP/out/lots bucketed */}
					<StackedBarChart
						data={overallByPackageWipData?.data}
						bars={overallBars}
						visibleBars={visibleOverAllBars}
						xAxisDataKey="label"
						height={300}
						syncId={"dashboard-trend"}
						yAxisWidth={550}
					/>
					<div
						className={clsx("flex mb-2 gap-2", {
							hidden: overallByPackageWipData?.pl_data === undefined,
						})}
					>
						<TogglerButton
							id="pl-toggle"
							toggleButtons={[
								{
									key: "pl1",
									label: "PL1",
									activeClass: "btn-primary",
									inactiveClass: "btn-ghost opacity-40",
								},
								{
									key: "pl6",
									label: "PL6",
									activeClass: "btn-secondary",
									inactiveClass: "btn-ghost opacity-40",
								},
							]}
							visibleBars={{
								pl1: activePLs.has("pl1"),
								pl6: activePLs.has("pl6"),
							}}
							toggleBar={(id, key) => {
								setActivePLs((prev) => {
									const next = new Set(prev);
									next.has(key) ? next.delete(key) : next.add(key);
									return next;
								});
							}}
							toggleAll={() => {
								const allActive = activePLs.has("pl1") && activePLs.has("pl6");
								setActivePLs(allActive ? new Set() : new Set(["pl1", "pl6"]));
							}}
						/>
						<TogglerButton
							id="pl-metric-toggle"
							toggleButtons={[
								{
									key: "total_wip",
									label: "WIP",
									activeClass: "",
									inactiveClass: "btn-ghost opacity-40",
								},
								{
									key: "total_outs",
									label: "Outs",
									activeClass: "",
									inactiveClass: "btn-ghost opacity-40",
								},
								{
									key: "total_lots",
									label: "Lots",
									activeClass: "",
									inactiveClass: "btn-ghost opacity-40",
								},
							]}
							visibleBars={{
								total_wip: plActiveTotals.has("total_wip"),
								total_outs: plActiveTotals.has("total_outs"),
								total_lots: plActiveTotals.has("total_lots"),
							}}
							toggleBar={(id, key, onlyThis) => {
								if (onlyThis) {
									setPlActiveTotals(
										new Set(
											Object.entries(onlyThis)
												.filter(([, v]) => v)
												.map(([k]) => k),
										),
									);
								} else {
									setPlActiveTotals((prev) => {
										const next = new Set(prev);
										next.has(key) ? next.delete(key) : next.add(key);
										return next;
									});
								}
							}}
							singleSelect={true}
						/>
					</div>
					{/* Chart 2 — PL1 vs PL6 bucketed */}
					<StackedBarChart
						data={overallByPackageWipData?.pl_data}
						bars={plBars}
						visibleBars={visiblePlBars}
						xAxisDataKey="label"
						height={300}
						syncId={"dashboard-trend"}
						yAxisWidth={550}
					/>
				</div>
			</div>
		</>
	);
};

export default WipOutTrendByPackage;
