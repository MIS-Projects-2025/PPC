import clsx from "clsx";
import { useEffect, useRef } from "react";

function IntermediateCheckbox({ className }) {
	const toggleRef = useRef(null);

	useEffect(() => {
		if (toggleRef.current) {
			toggleRef.current.indeterminate = true;
		}
	}, []);

	return (
		<input
			type="checkbox"
			className={clsx("toggle", className)}
			ref={toggleRef}
		/>
	);
}

export default IntermediateCheckbox;
