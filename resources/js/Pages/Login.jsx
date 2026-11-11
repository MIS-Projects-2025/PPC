import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import { Head, useForm } from "@inertiajs/react";
import { useMemo, useState } from "react";

// react-icons: chip set used for the background pattern
import { BiChip, BiMicrochip, BiSolidChip, BiSolidMicrochip } from "react-icons/bi";
import { CgSmartphoneChip } from "react-icons/cg";
import { CiMicrochip } from "react-icons/ci";
import { FaMicrochip } from "react-icons/fa";
import { FaMicrochip as Fa6Microchip } from "react-icons/fa6";
import { HiChip, HiOutlineChip } from "react-icons/hi";
import { HiCpuChip, HiMiniCpuChip, HiOutlineCpuChip } from "react-icons/hi2";
import {
    IoHardwareChip,
    IoHardwareChipOutline,
    IoHardwareChipSharp,
} from "react-icons/io5";
import { LiaMicrochipSolid } from "react-icons/lia";
import { LuEye, LuEyeOff, LuLock, LuMicrochip, LuUser } from "react-icons/lu";
import {
    PiPokerChip,
    PiPokerChipBold,
    PiPokerChipDuotone,
    PiPokerChipFill,
    PiPokerChipLight,
    PiPokerChipThin,
} from "react-icons/pi";
import { TbPokerChip } from "react-icons/tb";
import { VscChip } from "react-icons/vsc";

/*
 * FcSimCardChip is left out on purpose: "Fc" icons have hard-coded colors,
 * so they ignore the theme and look out of place at low opacity.
 * Add it to this list if you want it anyway.
 */
const CHIP_ICONS = [
    CiMicrochip,
    FaMicrochip,
    Fa6Microchip,
    IoHardwareChip,
    IoHardwareChipOutline,
    IoHardwareChipSharp,
    LuMicrochip,
    HiChip,
    HiOutlineChip,
    HiCpuChip,
    HiMiniCpuChip,
    HiOutlineCpuChip,
    BiChip,
    BiMicrochip,
    BiSolidChip,
    BiSolidMicrochip,
    CgSmartphoneChip,
    VscChip,
    TbPokerChip,
    PiPokerChip,
    PiPokerChipBold,
    PiPokerChipDuotone,
    PiPokerChipFill,
    PiPokerChipLight,
    PiPokerChipThin,
    LiaMicrochipSolid,
];

// Small seeded PRNG so the pattern is identical on every render / SSR pass.
function mulberry32(seed) {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function buildBackdrop(cols = 8, rows = 6) {
    const rand = mulberry32(2026);
    const accentRand = mulberry32(7); // separate stream so layout isn't affected

    // Shuffle the icon pool once, then cycle through it so neighbours differ.
    const pool = [...CHIP_ICONS];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const items = [];
    let n = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            items.push({
                Icon: pool[n % pool.length],
                left: ((c + 0.5 + (rand() - 0.5) * 0.7) / cols) * 100,
                top: ((r + 0.5 + (rand() - 0.5) * 0.7) / rows) * 100,
                size: 20 + rand() ** 2 * 200,
                rotate: (rand() - 0.5) * 70,
                // ~1 in 4 chips are "accent" chips with much higher opacity
                opacity: (() => {
                    const base = 0.07 + rand() * 0.09;
                    const isAccent = accentRand() < 0.28;
                    const boost = 0.25 + accentRand() * 0.2;
                    return isAccent ? boost : base;
                })(),
                duration: 10 + rand() * 8,
                delay: -rand() * 14,
            });
            n++;
        }
    }
    return items;
}

function ChipBackdrop() {
    const items = useMemo(() => buildBackdrop(), []);

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
            <style>{`
                @keyframes ppc-drift {
                    from { transform: translate3d(0, 0, 0); }
                    to   { transform: translate3d(6px, -10px, 0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .ppc-chip { animation: none !important; }
                }
            `}</style>

            {/* Soft glow behind the card */}
            <div className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

            {/* Dot grid */}
            <div
                className="absolute inset-0 text-base-content opacity-[0.07]"
                style={{
                    backgroundImage:
                        "radial-gradient(currentColor 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                }}
            />

            {/* Chip icons, thinned out toward the centre so the card stays calm */}
            <div
                className="absolute inset-0"
                style={{
                    WebkitMaskImage:
                        "radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,0.2), #000 100%)",
                    maskImage:
                        "radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,0.2), #000 100%)",
                }}
            >
                {items.map(
                    (
                        { Icon, left, top, size, rotate, opacity, duration, delay },
                        i,
                    ) => (
                        <span
                            key={i}
                            className="ppc-chip absolute text-primary"
                            style={{
                                left: `${left}%`,
                                top: `${top}%`,
                                opacity,
                                animation: `ppc-drift ${duration}s ease-in-out ${delay}s infinite alternate`,
                            }}
                        >
                            <Icon
                                size={size}
                                style={{ transform: `rotate(${rotate}deg)` }}
                            />
                        </span>
                    ),
                )}
            </div>
        </div>
    );
}

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);

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

            <main className="relative isolate flex min-h-[100%] items-center justify-center overflow-hidden bg-base-200 px-4 py-12">
                <ChipBackdrop />

                <div className="relative w-full max-w-md">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-lg shadow-primary/30 ring-4 ring-primary/10">
                            <LuMicrochip className="h-8 w-8" aria-hidden="true" />
                        </div>

                        <h1 className="text-3xl font-bold tracking-tight text-base-content">
                            PPC PORTAL
                        </h1>

                        <p className="mt-2 text-sm text-base-content/60">
                            Sign in with your employee credentials to continue.
                        </p>
                    </div>

                    {/* Login card */}
                    <div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/85 shadow-xl shadow-base-content/5 backdrop-blur-md">
                        <div className="h-1 w-full bg-primary" />

                        <form
                            onSubmit={submit}
                            className="space-y-5 p-6 sm:p-8"
                        >
                            {/* Employee ID */}
                            <div>
                                <InputLabel
                                    htmlFor="employeeID"
                                    value="Employee ID"
                                    className="mb-1.5 text-sm font-medium text-base-content"
                                />

                                <div className="relative">
                                    <LuUser
                                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40"
                                        aria-hidden="true"
                                    />

                                    <TextInput
                                        id="employeeID"
                                        name="employeeID"
                                        value={data.employeeID}
                                        className="block w-full rounded-lg border-slate-300 bg-base-100 py-2.5 pl-10 pr-3 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                        placeholder="Enter your employee ID"
                                        autoComplete="username"
                                        autoFocus
                                        required
                                        aria-invalid={!!errors.employeeID}
                                        onChange={(e) =>
                                            setData("employeeID", e.target.value)
                                        }
                                    />
                                </div>

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
                                    className="mb-1.5 text-sm font-medium text-base-content"
                                />

                                <div className="relative">
                                    <LuLock
                                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-base-content/40"
                                        aria-hidden="true"
                                    />

                                    <TextInput
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={data.password}
                                        className="block w-full rounded-lg border-slate-300 bg-base-100 py-2.5 pl-10 pr-11 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        required
                                        aria-invalid={!!errors.password}
                                        onChange={(e) =>
                                            setData("password", e.target.value)
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-base-content/50 transition hover:text-base-content focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        aria-pressed={showPassword}
                                    >
                                        {showPassword ? (
                                            <LuEyeOff className="h-4 w-4" />
                                        ) : (
                                            <LuEye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                <InputError
                                    message={errors.password}
                                    className="mt-1.5"
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-content shadow-md shadow-primary/25 transition duration-200 hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-primary/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
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
                    <p className="mt-6 text-center text-xs text-base-content/50">
                        Authorized personnel only
                    </p>
                </div>
            </main>
        </>
    );
}