import Dropdown from "@/Components/sidebar/Dropdown";
import SidebarLink from "@/Components/sidebar/SidebarLink";
import { BiBarcode, BiCabinet, BiImport } from "react-icons/bi";
import { FaBatteryHalf, FaCheckCircle, FaRecycle } from "react-icons/fa";
import { FaCodeBranch, FaLayerGroup, FaTruckPickup } from "react-icons/fa6";
import {
	LuLayoutDashboard,
	LuList,
	LuListChecks,
	LuPackage,
} from "react-icons/lu";
import { MdConveyorBelt } from "react-icons/md";
import { TbProgressCheck, TbResize, TbSettings } from "react-icons/tb";

export default function NavLinks({ isCollapse = false }) {
	return (
		<nav
			className="flex flex-col space-y-1 overflow-y-auto grow"
			style={{ scrollbarWidth: "none" }}
		>
			<SidebarLink
				isIconOnly={isCollapse}
				href={route("dashboard")}
				label="Dashboard"
				icon={<LuLayoutDashboard className="w-4 h-4" />}
				// notifications={0}
			/>

			<Dropdown
				isIconOnly={isCollapse}
				label="WIP Monitoring"
				icon={<LuListChecks className="w-4 h-4" />}
				links={[
					{
						href: route("wip.trend"),
						label: "WIP Trend",
						icon: <TbProgressCheck className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("out.trend"),
						label: "Out Trend",
						icon: <FaCheckCircle className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("bodySize"),
						label: "Body Size",
						icon: <TbResize className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("wipTable"),
						label: "WIP Station",
						icon: <FaCodeBranch className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("pickup.dashboard"),
						label: "Pickup Trend",
						icon: <FaTruckPickup className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("residual.dashboard"),
						label: "Residual Dashboard",
						icon: <FaRecycle className="w-4 h-4" />,
						notification: false,
					},
				]}
				notification={false}
			/>

			<Dropdown
				isIconOnly={isCollapse}
				label="Production"
				icon={<MdConveyorBelt className="w-4 h-4" />}
				links={[
					{
						href: route("lot-upstream.index", { productionLine: "pl1" }),
						label: "PL1 Lot Controller",
						icon: <MdConveyorBelt className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("lot-upstream.index", { productionLine: "pl6" }),
						label: "PL6 Lot Controller",
						icon: <MdConveyorBelt className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("rack.edit"),
						label: "Rack Configurator",
						icon: <BiCabinet className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("rack.barcode"),
						label: "Rack Barcodes",
						icon: <BiBarcode className="w-4 h-4" />,
						notification: false,
					},
				]}
				notification={false}
			/>

			<Dropdown
				isIconOnly={isCollapse}
				label="Maintenance"
				icon={<TbSettings className="w-4 h-4" />}
				links={[
					{
						href: route("pl-ref.master.index"),
						label: "Production Line",
						icon: <MdConveyorBelt className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("package.group.index"),
						label: "Package Group",
						icon: <FaLayerGroup className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("f3.raw.package.index"),
						label: "F3 Packages",
						icon: <LuPackage className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("package.capacity.index"),
						label: "Capacity",
						icon: <FaBatteryHalf className="w-4 h-4" />,
						notification: false,
					},
					{
						href: route("package.body_size.capacity.index"),
						label: "Body Size Capacity",
						icon: <FaBatteryHalf className="w-4 h-4" />,
						notification: false,
					},
				]}
				notification={false}
			/>

			<SidebarLink
				isIconOnly={isCollapse}
				href={route("import.index")}
				label="Import Data"
				icon={<BiImport className="w-4 h-4" />}
				// notifications={0}
			/>

			<SidebarLink
				isIconOnly={isCollapse}
				href={route("f3.list.index")}
				label="F3 Wip & Out List"
				icon={<LuList className="w-4 h-4" />}
				notifications={false}
			/>

			<SidebarLink
				isIconOnly={isCollapse}
				href={route("partname.index")}
				label="Partname List"
				icon={<LuList className="w-4 h-4" />}
				notifications={false}
			/>

			<SidebarLink
				isIconOnly={isCollapse}
				href={route("pickup.index")}
				label="Pickup List"
				icon={<LuList className="w-4 h-4" />}
				notifications={false}
			/>

			{/* 
            {["superadmin", "admin", "programmer 1"].includes(
                role?.toLowerCase()
            ) && (
                <SidebarLink
                    href={route("admin")}
                    label="Administrators"
                    icon={<FaUsers className="w-4 h-4" />}
                />
            )} */}
		</nav>
	);
}
// import Dropdown from "@/Components/sidebar/Dropdown";
// import SidebarLink from "@/Components/sidebar/SidebarLink";
// import { usePage } from "@inertiajs/react";

// export default function NavLinks() {
//     const { emp_data } = usePage().props;
//     return (
//         <nav
//             className="flex flex-col flex-grow space-y-1 overflow-y-auto"
//             style={{ scrollbarWidth: "none" }}
//         >
//             <SidebarLink
//                 href={route("dashboard")}
//                 label="Dashboard"
//                 icon={
//                     <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                         strokeWidth="1.5"
//                         stroke="currentColor"
//                         className="w-5 h-5"
//                     >
//                         <path
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
//                         />
//                     </svg>
//                 }
//                 notifications={5}
//             />

//             <Dropdown
//                 label="WIP Monitoring"
//                 icon={
//                     <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                         strokeWidth="1.5"
//                         stroke="currentColor"
//                         className="w-5 h-5"
//                     >
//                         <path
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
//                         />
//                     </svg>
//                 }
//                 links={[
//                     {
//                         href: route("admin"),
//                         label: "WIP Dashboard",
//                         notification: true,
//                     },
//                     {
//                         href: route("admin"),
//                         label: "WIP Table",
//                         notification: 125,
//                     },
//                     {
//                         href: route("dashboard"),
//                         label: "Pickup Dashboard",
//                         notification: false,
//                     },
//                     {
//                         href: route("dashboard"),
//                         label: "Residual Dashboard",
//                         notification: false,
//                     },
//                 ]}
//                 notification={true}
//             />

//             <Dropdown
//                 label="User Settings"
//                 icon={
//                     <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         fill="none"
//                         viewBox="0 0 24 24"
//                         strokeWidth="1.5"
//                         stroke="currentColor"
//                         className="w-5 h-5"
//                     >
//                         <path
//                             strokeLinecap="round"
//                             strokeLinejoin="round"
//                             d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
//                         />
//                     </svg>
//                 }
//                 links={[
//                     {
//                         href: route("admin"),
//                         label: "Profile",
//                         notification: true,
//                     },
//                     {
//                         href: route("admin"),
//                         label: "Account",
//                         notification: 125,
//                     },
//                     {
//                         href: route("dashboard"),
//                         label: "No notifications",
//                         notification: false,
//                     },
//                 ]}
//                 notification={true}
//             />

//             {["superadmin", "admin"].includes(emp_data?.emp_system_role) && (
//                 <div>
//                     <SidebarLink
//                         href={route("admin")}
//                         label="Administrators"
//                         icon={
//                             <svg
//                                 xmlns="http://www.w3.org/2000/svg"
//                                 fill="none"
//                                 viewBox="0 0 24 24"
//                                 strokeWidth="1.5"
//                                 stroke="currentColor"
//                                 className="w-5 h-5"
//                             >
//                                 <path
//                                     strokeLinecap="round"
//                                     strokeLinejoin="round"
//                                     d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
//                                 />
//                             </svg>
//                         }
//                         // notifications={5}
//                     />
//                 </div>
//             )}
//         </nav>
//     );
// }
