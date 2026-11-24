<?php

namespace Database\Seeders;

use App\Models\DowntimeCode;
use Illuminate\Database\Seeder;

/**
 * Seeds the downtime codes. Safe to re-run (upsert by code).
 *
 * FUTURE: a maintenance page for downtime codes. Intentionally NOT built yet, for simplicity;
 * until then this seeder is the source of truth.
 *
 * Rule: every E_ and S_ code is_downtime = true. I_, P_, NV_, LOT CLOSING, NEW LOT are not.
 * Whitespace is trimmed/collapsed so codes can be matched reliably when typing.
 */
class DowntimeCodeSeeder extends Seeder
{
    private const RED = '#FF0000';
    private const GREY = '#BFBFBF';
    private const YELLOW_ORANGE = '#FFC000';
    private const PALE_BLUE = '#BDD7EE';
    private const NAVY = '#1F3864';

    private const E_CODES = <<<'TXT'
E_2D VISION
E_3D VISION
E_AGUL PROBLEM
E_AIR PRESSURE LOW
E_ALIGNMENT
E_BALL REJECT
E_CARRIER JAM
E_CHECKER 2 PROBLEM
E_CHIPOUT
E_CORRECTOR
E_CORRUPTEDFILE
E_CYLINDER
E_DOUBLE UNIT
E_DOWNPOSITION
E_EMPTY POCKET
E_END STOPPER
E_EPS 1
E_EXTENDED
E_F001
E_FAILED PBFT
E_FEEDING
E_FEEDING SEPARATOR
E_FLOATING
E_FORMING PROB
E_GRIPPER
E_GROUND  MASTER ALARM
E_HANDLER
E_HANG UP
E_HOMING SENSOR
E_INDEXER
E_INPOCKET
E_INPUT
E_INTRACK PROBLEM
E_LEADS
E_LEADS OR
E_LEADS VERIFICATION
E_LOADER
E_LOW AIR PRESSURE
E_MARK
E_MARK OR
E_MARK VERIFICATION
E_MINITABLE
E_MULTITUBE
E_ORIENTATOR
E_OTF
E_OUT OF POCKET
E_OUTPUT CLAMPER
E_OUTPUT PROBLEM
E_OUTPUT TUBE
E_PACKAGE OR
E_PAD OR
E_PAD VERIFICATION
E_PEDISPO
E_PNP
E_POST BUFFER
E_POST SEAL
E_POWERFAILURE
E_PP1
E_PP2
E_PP3
E_PRECISOR
E_PADGAP
E_PVI
E_REAR HEATER
E_RECENTERING
E_RECIPE FAILED
E_REJECT TRACK
E_RESCREEN
E_REVERSE JAM
E_ROTARY
E_RTM
E_RUNTIME ERROR
E_S1
E_SEAL MOTOR
E_SEALING
E_SENSOR
E_SEPARATOR
E_SERVO
E_SIMULATION
E_SING 1
E_SING 2
E_SING 3
E_SINGLE TUBE1
E_SINGLE TUBE3
E_SINGULATOR
E_SORTER
E_SPROCKET
E_STOP 0
E_STOP1
E_TAPER2
E_TAPING
E_TAPING1
E_TEMPERATURE
E_TAPE HOME
E_TRAY TRANSPORT
E_TUBE TRACK
E_TURRET
E_UNIT DETECTED @ TAPE
E_UNIT NOT DETECTED @ TAPE
E_UNSEATED
E_VACUUM
E_VISION
E_VISION STOPPER
E_VISION VACUUM
E_X2
E_X3
E_XTRAY PROB
E_Y3 PROBLEM
E_Z3L
TXT;

    private const GREY_CODES = <<<'TXT'
I_DETAPE
I_IDLMATL
I_IDLSTBY
I_INLINE INSPECTION
I_NO OPERATOR
I_OPERATOR TRANSFER
I_WAITING QA/BUY OFF
I_PLANNED IDLMATL
I_RESCREEN
I_REWORK
I_TRANSFER
I_WAITING LOT/ BAKE
I_WAITING LOT/ BRAND
I_WAITING LOT/ IQA
I_WAITING LOT/ LPI
I_WAITING MATERIALS
I_WAITING TECH
I_WAITING PM TECH
TXT;

    private const YELLOW_ORANGE_CODES = "I_F1\nI_F2";

    private const PALE_BLUE_CODES = "LOT CLOSING\nNEW LOT\nNV_PULLOUT LOT";

    private const NAVY_CODES = <<<'TXT'
P_M/C TRANSFER
P_MARK VERIFICATION
P_PDPM
P_PEEVAL
P_QTY. VERIFICATION
P_QUALIFICATION
P_SYSTEM TIME
TXT;

    // The source list calls these "yellow" but only defines "yellow-orange" (#FFC000), so S_ reuses it.
    private const S_CODES = <<<'TXT'
S_ADD MAPPING
S_BUY-OFF
S_CFCR
S_CONFIG
S_CONVERSION
S_SETUP
S_SOFTWARE UPDATE
TXT;

    public function run(): void
    {
        $now = now();
        $rows = [];

        $groups = [
            [self::E_CODES, self::RED],
            [self::GREY_CODES, self::GREY],
            [self::YELLOW_ORANGE_CODES, self::YELLOW_ORANGE],
            [self::PALE_BLUE_CODES, self::PALE_BLUE],
            [self::NAVY_CODES, self::NAVY],
            [self::S_CODES, self::YELLOW_ORANGE],
        ];

        foreach ($groups as [$list, $color]) {
            foreach (preg_split('/\R/', $list) as $line) {
                $code = trim(preg_replace('/\s+/', ' ', $line));
                if ($code === '') {
                    continue;
                }
                $rows[$code] = [
                    'code'        => $code,
                    'bg_color'    => $color,
                    'is_downtime' => str_starts_with($code, 'E_') || str_starts_with($code, 'S_'),
                    'created_at'  => $now,
                    'updated_at'  => $now,
                ];
            }
        }

        DowntimeCode::upsert(array_values($rows), ['code'], ['bg_color', 'is_downtime', 'updated_at']);
    }
}
