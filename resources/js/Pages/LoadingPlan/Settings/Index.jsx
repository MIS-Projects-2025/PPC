import { Head, Link, router } from '@inertiajs/react';
import { BiArrowBack } from 'react-icons/bi';
import CapacitySettings from './CapacitySettings';
import PackageGroupSettings from './PackageGroupSettings';

// red https://claude.ai/chat/4cf4cbb4-5c0d-4b87-bdc0-102fc60fee59

const SECTIONS = [
    { key: 'capacity', label: 'Machine Capacity', href: '/loading-plan/settings/capacity' },
    { key: 'package-groups', label: 'Package Groups', href: '/loading-plan/settings/package-groups' },
];

const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else router.visit('/loading-plan'); // opened directly / in a new tab: nothing to go back to
};

export default function Index({ section = 'capacity', machines = [] }) {
    const current = SECTIONS.find((s) => s.key === section) ?? SECTIONS[0];

    return (
        <>
            <Head title={`Settings · ${current.label}`} />
            <div className="flex h-full overflow-hidden bg-base-200">
                <aside className="w-56 shrink-0 overflow-y-auto rounded-lg border-r border-base-300 bg-base-100 p-4">
                    <div className='flex items-center gap-2 mb-3'>
                        <button type="button" className="btn btn-square btn-sm" onClick={goBack} aria-label="Back">
                            <BiArrowBack size={16} />
                        </button>
                        <h1 className="text-lg font-semibold">Settings</h1>
                    </div> 

                    <ul className="menu w-full gap-1 p-0">
                        {SECTIONS.map((s) => (
                            <li key={s.key}>
                                <Link replace href={s.href} className={s.key === current.key ? 'menu-active' : ''}>
                                    {s.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </aside>

                <main className="min-w-0 flex-1 overflow-y-auto p-6">
                    <h2 className="mb-4 text-xl font-semibold">{current.label}</h2>
                    {current.key === 'capacity' && <CapacitySettings machines={machines} />}
                    {current.key === 'package-groups' && <PackageGroupSettings />}
                </main>
            </div>
        </>
    );
}