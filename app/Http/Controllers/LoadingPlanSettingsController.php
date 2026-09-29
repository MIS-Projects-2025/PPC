<?php

namespace App\Http\Controllers;

use App\Models\QdnMachine;
use Inertia\Inertia;
use Inertia\Response;

class LoadingPlanSettingsController extends Controller
{
    public const SECTIONS = ['capacity', 'package-groups'];

    public function index(string $section = 'capacity'): Response
    {
        abort_unless(in_array($section, self::SECTIONS, true), 404);

        return Inertia::render('LoadingPlan/Settings/Index', [
            'section'  => $section,
            // Only the capacity section needs the machine list.
            // Assumes machine_list has `machine_num` and `factory` columns.
            'machines' => $section === 'capacity'
                ? QdnMachine::orderBy('machine_num')->get(['id', 'machine_num', 'factory'])
                : [],
        ]);
    }
}
