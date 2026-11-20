import Collapse from "@/Components/Collapse";
import Tabs from "@/Components/Tabs";
import { router } from "@inertiajs/react";
import React, { useState } from "react";
import { TbAlertCircle } from "react-icons/tb";

const excelInstructions = [
	"Exactly one sheet",
	"Ensure all data is in the correct columns without any misplaced entries.",
	"Use only the correct, recognized header names—unknown headers are not allowed.",
	"Include all required headers; missing headers may cause import errors.",
	"Do not include summary rows such as totals or grand totals.",
	"Keep all rows consistent in format and structure.",
];

const ImportPageLayout = ({ pageName = "F1/F2 Wip & Outs", showExcelInstructions = true, children }) => {
	const [selectedFactory, setSelectedFactory] = useState(pageName);

	const handleFactoryChange = (selectedFactory) => {
		setSelectedFactory(selectedFactory);

		if (selectedFactory === "F1/F2 Wip & Outs") {
			router.visit(route("import.index"));
		}

		if (selectedFactory === "F3 Wip & Outs") {
			router.visit(route("import.f3.index"));
		}

		if (selectedFactory === "F1/F2 PickUp") {
			router.visit(route("import.pickup.index"));
		}

		if (selectedFactory === "F3 PickUp") {
			router.visit(route("import.f3.pickup.index"));
		}
	};

	return (
		<>
			<h1 className="font-semibold mb-4">Import {pageName} Data</h1>
			<Tabs
				options={[
					"F1/F2 Wip & Outs",
					"F3 Wip & Outs",
					"F1/F2 PickUp",
					"F3 PickUp",
				]}
				selectedFactory={selectedFactory}
				handleFactoryChange={handleFactoryChange}
				tabClassName={"mb-2"}
			/>
			{showExcelInstructions && (<Collapse
				title={
					<div className="flex items-center gap-2">
						<TbAlertCircle />
						<div>Important Excel File Format</div>
					</div>
				}
				className={"mb-2 rounded-lg"}
			>
				<ul className="list">
					{excelInstructions.map((instruction, index) => (
						<li key={index} className="list-row h-8 leading-none">
							{instruction}
						</li>
					))}
				</ul>
			</Collapse>)}
			<div className="flex-1">{React.cloneElement(children, { pageName })}</div>
		</>
	);
};

export default ImportPageLayout;
