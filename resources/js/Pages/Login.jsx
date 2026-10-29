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

            <main className="relative flex min-h-[100%] items-center justify-center overflow-hidden bg-slate-50 px-4 py-12">
                <div className="relative w-full max-w-md">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-600 text-white shadow-lg shadow-pink-600/20">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-7 w-7"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 3 5 6v5c0 4.5 2.9 8.1 7 10 4.1-1.9 7-5.5 7-10V6l-7-3Z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m9 12 2 2 4-4"
                                />
                            </svg>
                        </div>

                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            PPC PORTAL
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Sign in with your employee credentials to continue.
                        </p>
                    </div>

                    {/* Login card */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
                        <form onSubmit={submit} className="space-y-5">
                            {/* Employee ID */}
                            <div>
                                <InputLabel
                                    htmlFor="employeeID"
                                    value="Employee ID"
                                    className="mb-1.5 text-sm font-medium text-slate-700"
                                />

                                <TextInput
                                    id="employeeID"
                                    name="employeeID"
                                    value={data.employeeID}
                                    className="block w-full rounded-lg border-slate-300 py-2.5 shadow-sm transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10"
                                    placeholder="Enter your employee ID"
                                    autoComplete="username"
                                    autoFocus
                                    required
                                    aria-invalid={!!errors.employeeID}
                                    onChange={(e) =>
                                        setData("employeeID", e.target.value)
                                    }
                                />

                                <InputError
                                    message={errors.employeeID}
                                    className="mt-1.5"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <InputLabel
                                    htmlFor="password"
                                    value="Password"
                                    className="mb-1.5 text-sm font-medium text-slate-700"
                                />

                                <TextInput
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    className="block w-full rounded-lg border-slate-300 py-2.5 shadow-sm transition placeholder:text-slate-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10"
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    required
                                    aria-invalid={!!errors.password}
                                    onChange={(e) =>
                                        setData("password", e.target.value)
                                    }
                                />

                                <InputError
                                    message={errors.password}
                                    className="mt-1.5"
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-500/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
                            >
                                {processing && (
                                    <svg
                                        className="h-4 w-4 animate-spin"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
                                        />
                                    </svg>
                                )}

                                {processing ? "Signing in..." : "Sign in"}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="mt-6 text-center text-xs text-slate-400">
                        Authorized personnel only
                    </p>
                </div>
            </main>
        </>
    );
}