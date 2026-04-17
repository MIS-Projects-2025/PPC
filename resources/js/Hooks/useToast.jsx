import { clsx } from "clsx";
import { toast } from "react-hot-toast";
import { FaCheckCircle, FaInfo, FaMinusCircle } from "react-icons/fa";

export function useToast() {
	// Removed hardcoded "text-sm" from base/variants to allow easy overrides
	const base =
		"z-9999 alert shadow-lg rounded-lg w-fit max-w-sm font-medium transition-all duration-300";

	const variants = {
		success: "alert-success text-success-content",
		error: "alert-error text-error-content",
		info: "alert-info text-info-content",
		loading: "alert-info text-info-content",
	};

	const icons = {
		success: <FaCheckCircle size={18} />,
		error: <FaMinusCircle size={18} />,
		info: <FaInfo size={18} />,
		loading: <span className="loading loading-spinner" />,
	};

	const show = (type, message, opts = {}) => {
		toast.custom(
			(t) => (
				<div
					className={clsx(
						base,
						variants[type],
						// Default to text-sm if no specific text size class is provided in opts.className
						{ "text-sm": !opts.className?.includes("text-") },
						t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
						opts.className,
					)}
				>
					{icons[type]}
					<span>{message}</span>
				</div>
			),
			{
				id: opts.id,
				duration: opts.duration ?? (type === "error" ? 5000 : 3000),
				position: opts.position ?? "top-right",
				...opts,
			},
		);
	};

	const promise = (promiseFn, messages = {}, opts = {}) => {
		const id = opts.id ?? Math.random().toString(36).slice(2);

		show("loading", messages.loading ?? "Loading...", {
			id,
			duration: Infinity,
			...opts,
		});

		promiseFn
			.then((result) => {
				const msg =
					typeof messages.success === "function"
						? messages.success(result)
						: (messages.success ?? "Done!");
				show("success", msg, { id, ...opts });
				return result;
			})
			.catch((err) => {
				const msg =
					typeof messages.error === "function"
						? messages.error(err)
						: (messages.error ?? "Something went wrong");
				show("error", msg, { id, ...opts });
			});

		return promiseFn;
	};

	return {
		success: (msg, opts) => show("success", msg, opts),
		error: (msg, opts) => show("error", msg, opts),
		info: (msg, opts) => show("info", msg, opts),
		loading: (msg, opts) => show("loading", msg, opts),
		promise,
	};
}
