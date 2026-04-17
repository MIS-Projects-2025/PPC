import Footer from "@/Components/Footer";
import NavBar from "@/Components/NavBar";
import Sidebar from "@/Components/Sidebar/SideBar";
import { useF1F2PackagesStore } from "@/Store/f1f2PackageListStore";
import { useImportTraceStore } from "@/Store/importTraceStore";
import { useWipStore } from "@/Store/overallDailyWipTrendStore";
import { useWorkweekStore } from "@/Store/workweekListStore";
import { usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";

export default function AuthenticatedLayout({ header, children }) {
	const { fetchPackages } = useF1F2PackagesStore();
	const { fetchWip } = useWipStore();
	const { fetchWorkweek } = useWorkweekStore();
	const { fetchAllImports } = useImportTraceStore();

	const [hasUserFetched, setHasUserFetched] = useState(false);
	const { emp_data } = usePage().props;

	useEffect(() => {
		if (!emp_data || hasUserFetched) return;

		// fetchPackages();
		// fetchWip();
		// fetchWorkweek();
		// fetchAllImports();

		setHasUserFetched(true);
	}, [emp_data, hasUserFetched]);

	return (
		<div className="flex bg-base-200 h-screen text-sm">
			<Sidebar />
			<div className="h-full flex flex-col flex-1 overflow-y-hidden">
				<NavBar />
				<div className="px-4 flex-1 w-full relative overflow-y-auto">
					<div className="w-full">{children}</div>
				</div>
				<Footer />
			</div>
		</div>
		// <div className="flex bg-base-200 h-screen text-sm">
		// 	<Sidebar />
		// 	<div className="h-full flex flex-col flex-1 overflow-y-hidden">
		// 		<NavBar />
		// 		<div className="p-4 z-10 flex-1 relative w-full overflow-y-auto">
		// 			<div className="w-full">{children}</div>
		// 		</div>
		// 		<Footer />
		// 	</div>
		// </div>
	);
}
