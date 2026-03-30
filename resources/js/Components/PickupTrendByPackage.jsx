import { periodOptions } from "@/Constants/periodOptions";
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
import { useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import CancellableActionButton from "./CancellableActionButton";
import TrendLineChart from "./Charts/TrendLineChart";
import FloatingLabelInput from "./FloatingLabelInput";
import MultiSelectSearchableDropdown from "./MultiSelectSearchableDropdown";
import Tabs from "./Tabs";

const test = ["F1", "F2", "F3", "Overall"];

const PickupTrendByPackage = ({
	isVisible,
	title = "",
	dataAPI = null,
	showWIPLines = {},
	showPLLines = {},
	mainTrendChartTitle = "WIP & OUTs",
	noChartTable = false,
	downloadRoute = null,
}) => {
	const [isChartTableVisible, setIsChartTableVisible] = useState(
		!noChartTable ? true : false,
	);

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
	console.log(
		"🚀 ~ WipOutTrendByPackage ~ overallByPackageWipData:",
		overallByPackageWipData,
	);

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

					{!noChartTable && (
						<button
							type="button"
							className="btn btn-sm btn-outline h-8 btn-secondary px-4"
							onClick={() => setIsChartTableVisible((prev) => !prev)}
						>
							{}
							{isChartTableVisible ? (
								<FaEye className="mr-2" />
							) : (
								<FaEyeSlash className="mr-2" />
							)}
							<span className="w-18">
								{isChartTableVisible ? "Show Table" : "Hide Table"}
							</span>
						</button>
					)}
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
						title={chartTitle(mainTrendChartTitle)}
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
				</div>
			</div>
		</>
	);
};

export default PickupTrendByPackage;
