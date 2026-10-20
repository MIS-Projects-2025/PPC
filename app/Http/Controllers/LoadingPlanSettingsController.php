<?php

namespace App\Http\Controllers;

use App\Models\QdnMachine;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\MachinePlatformCapacityBand;

class LoadingPlanSettingsController extends Controller
{
    public const SECTIONS = ['capacity', 'capacity-bands', 'package-groups'];

    public function index(string $section = 'capacity'): Response
    {
        abort_unless(in_array($section, self::SECTIONS, true), 404);

        return Inertia::render('LoadingPlan/Settings/Index', [
            'section'  => $section,
            'machines' => $section === 'capacity'
                ? QdnMachine::with('currentCapacity:id,machine_id,capacity,effective_from')
                ->orderBy('machine_num')
                ->get(['id', 'machine_num', 'factory'])
                : [],
            'bands'    => $section === 'capacity-bands'
                ? MachinePlatformCapacityBand::orderBy('platform')->orderBy('qty_min')->get()
                : [],
        ]);
    }
}
