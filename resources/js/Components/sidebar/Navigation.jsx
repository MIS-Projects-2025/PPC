import Dropdown from "@/Components/sidebar/Dropdown";
import SidebarLink from "@/Components/sidebar/SidebarLink";
import { BiBarcode, BiCabinet, BiImport } from "react-icons/bi";
import { FaBatteryHalf, FaCheckCircle, FaRecycle } from "react-icons/fa";
import { FaCodeBranch, FaLayerGroup, FaTruckPickup } from "react-icons/fa6";
import { ImCalendar } from "react-icons/im";
import {
    LuLayoutDashboard,
    LuList,
    LuListChecks,
    LuPackage,
} from "react-icons/lu";
import { MdConveyorBelt } from "react-icons/md";
import { PiTableLight } from "react-icons/pi";
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
                label="Loading Plan"
                icon={<ImCalendar className="w-4 h-4" />}
                links={[
                    {
                        href: route("loading-plan.index"),
                        label: "Loading Plan",
                        icon: <ImCalendar className="w-4 h-4" />,
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
                    // {
                    //     href: route("lot-upstream.index", {
                    //         productionLine: "pl1",
                    //     }),
                    //     label: "PL1 WIP Controller",
                    //     icon: <MdConveyorBelt className="w-4 h-4" />,
                    //     notification: false,
                    // },
                    // {
                    //     href: route("rack.slotMap", { productionLine: "pl1" }),
                    //     label: "PL1 Rack Slot Map",
                    //     icon: <PiTableLight className="w-4 h-4" />,
                    //     notification: false,
                    // },
                    {
                        href: route("lot-upstream.index", {
                            productionLine: "pl6",
                        }),
                        label: "PL6 WIP Controller",
                        icon: <MdConveyorBelt className="w-4 h-4" />,
                        notification: false,
                    },
                    {
                        href: route("rack.slotMap", { productionLine: "pl6" }),
                        label: "PL6 Rack Slot Map",
                        icon: <PiTableLight className="w-4 h-4" />,
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
        </nav>
    );
}