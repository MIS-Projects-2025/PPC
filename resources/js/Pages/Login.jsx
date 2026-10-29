import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import { Head, useForm } from "@inertiajs/react";

export default function Login() {
	const { data, setData, post, processing, errors } = useForm({
		employeeID: "",
		password: "",
	});

	const submit = (e) => {
		e.preventDefault();
		post(route("login.store"), {
			onFinish: () => setData("password", ""),
		});
	};

	return (
		<>
			<Head title="Login" />

			<div className="flex items-center justify-center min-h-screen">
				<form
					onSubmit={submit}
					className="w-full max-w-sm p-6 space-y-4 border rounded-lg"
				>
					<h1 className="text-2xl font-bold">Sign in</h1>

					<div>
						<InputLabel htmlFor="employeeID" value="Employee ID" />
						<TextInput
							id="employeeID"
							name="employeeID"
							value={data.employeeID}
							className="block w-full mt-1"
							autoComplete="username"
							onChange={(e) => setData("employeeID", e.target.value)}
						/>
						<InputError message={errors.employeeID} className="mt-1" />
					</div>

					<div>
						<InputLabel htmlFor="password" value="Password" />
						<TextInput
							id="password"
							type="password"
							name="password"
							value={data.password}
							className="block w-full mt-1"
							autoComplete="current-password"
							onChange={(e) => setData("password", e.target.value)}
						/>
						<InputError message={errors.password} className="mt-1" />
					</div>

					<button
						type="submit"
						className="w-full btn btn-primary"
						disabled={processing}
					>
						Login
					</button>
				</form>
			</div>
		</>
	);
}