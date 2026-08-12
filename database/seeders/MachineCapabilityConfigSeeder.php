<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MachineCapabilityConfigSeeder extends Seeder
{
    /**
     * Source data, one entry per row in the source list.
     *
     * packages: list of package rows this config accepts. Each has:
     *   - package: must match ppc_package_master.package exactly
     *   - required_factory: nullable string (e.g. 'F1'), scopes acceptance
     *   - dims: list of sanitized body sizes for THIS package under THIS
     *     config; empty array = unrestricted for that package
     *
     * process_type: 'taping' | 'tubing' | 'both' | null
     * leadcounts: list of ['mode' => 'include'|'exclude', 'values' => [...]]
     * remarks: original free text, kept for audit/traceability
     *
     * Interpretation notes (see inline comments below for anything
     * non-obvious from the raw remarks):
     *
     * - "but convertible to other DFN/QFN" is read as: the CURRENT setup
     *   has a size, but the CAPABILITY is unrestricted for QFN/DFN
     *   (conversion between sizes is possible). So these rows get
     *   dims: [] for QFN/DFN. Any accompanying "F1 LFCSP <size>" clause
     *   is still a real restriction on LFCSP specifically, since LFCSP
     *   is scoped to F1 and often kept at a fixed size even when
     *   QFN/DFN convert freely.
     * - Rows WITHOUT "convertible" wording (e.g. "2x2 QFN/DFN and F1
     *   LFCSP 2x2") are read as a genuine fixed-size restriction on
     *   both QFN/DFN and LFCSP.
     * - 19HSI250 / 20HSI250 / 22HSI250 / 24HSI250: the Package column
     *   only lists "QFN / DFN", but the remark also mentions "F1
     *   LFCSP". Remark treated as authoritative — LFCSP (F1-scoped,
     *   unrestricted size) added as an accepted package here. Flag
     *   this to confirm it's intentional, since the source table's
     *   Package column and Remarks column disagree.
     * - 08ST60 ("only 6x6 and up"): this is an open-ended /
     *   inequality-style restriction the current schema can't express
     *   (body_size is a discrete string set, not a numeric range).
     *   Seeded as unrestricted (dims: []) with the remark preserved —
     *   NOT a faithful capture of "6x6 and up". If this threshold
     *   needs to be enforced by the matcher, the schema needs a
     *   numeric column (or an explicit enumerated size list) before
     *   this can be seeded accurately. Flagging rather than guessing
     *   at the missing enumeration.
     */
    private array $rows = [
        // ---------------- TSOT ----------------
        ['machine_num' => '03HSI200', 'packages' => [['package' => 'TSOT', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Can cater all TSOT regardless of leadcount'],
        ['machine_num' => '15HSI250', 'packages' => [['package' => 'TSOT', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Can cater all TSOT regardless of leadcount'],
        ['machine_num' => '21HSI250', 'packages' => [['package' => 'TSOT', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Can cater all TSOT regardless of leadcount'],
        ['machine_num' => '28HSI250', 'packages' => [['package' => 'TSOT', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Can cater all TSOT regardless of leadcount'],
        ['machine_num' => '31HSI250', 'packages' => [['package' => 'TSOT', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Can cater all TSOT regardless of leadcount'],
        ['machine_num' => '34HSI250', 'packages' => [['package' => 'TSOT', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Can cater all TSOT regardless of leadcount'],

        // ---------------- SOT_89 / SOT-23 ----------------
        ['machine_num' => '05HSI200', 'packages' => [['package' => 'SOT_89', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Dedicated for SOT-89'],
        ['machine_num' => '37HSI250', 'packages' => [['package' => 'SOT-23', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Can cater all SOT-23'],
        ['machine_num' => '02HSI200', 'packages' => [['package' => 'SOT-23', 'required_factory' => null, 'dims' => []]], 'leadcounts' => [['mode' => 'exclude', 'values' => [3]]], 'remarks' => 'Cannot cater 3L SOT-23'],
        ['machine_num' => '11HSI250', 'packages' => [['package' => 'SOT-23', 'required_factory' => null, 'dims' => []]], 'leadcounts' => [['mode' => 'exclude', 'values' => [3]]], 'remarks' => 'Cannot cater 3L SOT-23'],

        // ---------------- SC70 ----------------
        ['machine_num' => '31HSI250', 'packages' => [['package' => 'SC70', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Can cater all SC70'],
        ['machine_num' => '32HSI250', 'packages' => [['package' => 'SC70', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Can cater all SC70'],

        // ---------------- LFCSP standalone (F1-scoped, fixed dedicated sizes) ----------------
        ['machine_num' => '01V12', 'packages' => [['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => ['2x3', '3x2']]], 'remarks' => 'F1 LFCSP 2x3 / 3x2 only'],
        ['machine_num' => '04HSI400T', 'packages' => [['package' => 'LFCSP', 'required_factory' => null, 'dims' => ['3x3']]], 'remarks' => 'Dedicated to 3x3 LFCSP'],
        ['machine_num' => '06HSI400T', 'packages' => [['package' => 'LFCSP', 'required_factory' => null, 'dims' => ['4x4']]], 'remarks' => 'Dedicated to 4x4 LFCSP'],
        ['machine_num' => '07HSI400T', 'packages' => [['package' => 'LFCSP', 'required_factory' => null, 'dims' => ['5x5']]], 'remarks' => 'Dedicated to 5x5 LFCSP'],
        ['machine_num' => '08HSI400T', 'packages' => [['package' => 'LFCSP', 'required_factory' => null, 'dims' => ['6x6']]], 'remarks' => 'Dedicated to 6x6 LFCSP'],

        // ---------------- DDPAK (process_type only, no size restriction given) ----------------
        ['machine_num' => '06ST60', 'packages' => [['package' => 'DDPAK', 'required_factory' => null, 'dims' => []]], 'process_type' => 'taping', 'remarks' => 'DDPAK Taping Only'],
        ['machine_num' => '01ST60', 'packages' => [['package' => 'DDPAK', 'required_factory' => null, 'dims' => []]], 'process_type' => 'taping', 'remarks' => 'DDPAK Taping Only'],
        ['machine_num' => '44G6L', 'packages' => [['package' => 'DDPAK', 'required_factory' => null, 'dims' => []]], 'process_type' => 'both', 'remarks' => 'DDPAK Tubing and Taping'],

        // ---------------- QFN/DFN, convertible => unrestricted ----------------
        ['machine_num' => '02HSI400T', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => '4x5 but convertible to other DFN/QFN'],
        ['machine_num' => '04HSI200', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => '4x4 but convertible to other DFN/QFN'],
        ['machine_num' => '05HSI400T', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => '3x4 but convertible to other DFN/QFN'],
        ['machine_num' => '09HSI400T', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => '5x4 but convertible to other DFN/QFN'],
        ['machine_num' => '23HSI250', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => '5x6 but convertible to other DFN/QFN'],
        ['machine_num' => '35HSI250', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => '3x4 but convertible to other DFN/QFN'],
        ['machine_num' => '36HSI250', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => '5x6 but convertible to other DFN/QFN'],

        // ---------------- QFN/DFN convertible + LFCSP fixed-size (F1) ----------------
        ['machine_num' => '10HSI400T', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => ['3x3']],
        ], 'remarks' => '3x3 but convertible to other DFN/QFN and F1 LFCSP 3x3'],
        ['machine_num' => '26HSI250', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => ['3x2']],
        ], 'remarks' => '3x2 but convertible to other DFN/QFN and F1 LFCSP 3x2'],
        ['machine_num' => '29HSI250', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => ['5x5']],
        ], 'remarks' => '5x6 but convertible to other DFN/QFN and F1 LFCSP 5x5'],
        ['machine_num' => '29HSI400T', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => ['3x3']],
        ], 'remarks' => '3x3 but convertible to other DFN/QFN and F1 LFCSP 3x3'],

        // ---------------- QFN/DFN convertible + LFCSP (F1), no size given for LFCSP ----------------
        ['machine_num' => '25HSI250', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => []],
        ], 'remarks' => '3x2 but convertible to other DFN/QFN and F1 LFCSP'],
        ['machine_num' => '03HSI400T', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => []],
        ], 'remarks' => '3x3 but convertible to other DFN/QFN and F1 LFCSP'],
        ['machine_num' => '13HSI400i', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => []],
        ], 'remarks' => '3x3 but convertible to other DFN/QFN and F1 LFCSP'],

        // ---------------- QFN/DFN fixed-size (no "convertible") + LFCSP fixed-size (F1) ----------------
        ['machine_num' => '11HSI400i', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => ['2x2']],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => ['2x2']],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => ['2x2']],
        ], 'remarks' => '2x2 QFN/DFN and F1 LFCSP 2x2'],
        ['machine_num' => '12HSI400i', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => ['3x3']],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => ['3x3']],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => ['3x3']],
        ], 'remarks' => '3x3 QFN/DFN and F1 LFCSP 3x3'],
        ['machine_num' => '14HSI400i', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => ['2x2']],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => ['2x2']],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => ['2x2']],
        ], 'remarks' => '2x2 QFN/DFN and F1 LFCSP 2x2'],
        ['machine_num' => '18HSI250', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => ['3x5']],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => ['3x5']],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => ['3x5']],
        ], 'remarks' => '3x5 QFN/DFN and F1 LFCSP 3x5'],
        ['machine_num' => '13HSI250', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => ['6x6']],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => ['6x6']],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => ['6x6']],
        ], 'remarks' => '6x6 QFN/DFN and F1 LFCSP 6x6'],

        // ---------------- QFN/DFN convertible; Package column omits LFCSP but remark mentions
        //                  it — remark treated as authoritative (see class docblock) ----------------
        ['machine_num' => '19HSI250', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => []],
        ], 'remarks' => '3x2 but convertible to other DFN/QFN and F1 LFCSP'],
        ['machine_num' => '20HSI250', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => []],
        ], 'remarks' => '3x3 but convertible to other DFN/QFN and F1 LFCSP'],
        ['machine_num' => '22HSI250', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => []],
        ], 'remarks' => '3x3 but convertible to other DFN/QFN and F1 LFCSP'],
        ['machine_num' => '24HSI250', 'packages' => [
            ['package' => 'QFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'DFN', 'required_factory' => null, 'dims' => []],
            ['package' => 'LFCSP', 'required_factory' => 'F1', 'dims' => []],
        ], 'remarks' => '2x2 but convertible to other DFN/QFN and F1 LFCSP'],

        // ---------------- LCC ----------------
        ['machine_num' => '10HSI250', 'packages' => [['package' => 'LCC', 'required_factory' => null, 'dims' => []]], 'remarks' => '4x4 but convertible to other LCC'],

        // ---------------- QFN/DFN odd sizes, unrestricted ----------------
        // NOTE (08ST60): remark says "only 6x6 and up" — an open-ended
        // threshold the current schema can't express. Seeded here as
        // unrestricted; see class docblock.
        ['machine_num' => '08ST60', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Odd Sizes of QFN / DFN not catered in HSI set-up, only 6x6 and up'],
        // ['machine_num' => '02MT30', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Odd Sizes of QFN / DFN not catered in HSI set-up'],
        // ['machine_num' => '05ST60', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Odd Sizes of QFN / DFN not catered in HSI set-up'],
        ['machine_num' => '09ST60', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Odd Sizes of QFN / DFN not catered in HSI set-up'],
        ['machine_num' => '10ST60', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Odd Sizes of QFN / DFN not catered in HSI set-up'],
        ['machine_num' => '56AT28', 'packages' => [['package' => 'QFN', 'required_factory' => null, 'dims' => []], ['package' => 'DFN', 'required_factory' => null, 'dims' => []]], 'remarks' => 'Odd Sizes of QFN / DFN not catered in HSI set-up'],
    ];

    // Skipped rows for unknown machine_num values:
    // 07HSI400, 08HSI400, 02HSI400, 05HSI400, 09HSI400, 10HSI400, 29HSI400, 03HSI400, 
    // 13HSI400, 11HSI400I, 12HSI400, 14HSI400I,

    // 02MT30, 05ST60

    public function run(): void
    {
        // package name => id, from ppc_package_master (default connection)
        $packageIds = DB::table('ppc_package_master')->pluck('id', 'package');

        // machine_num => machine_id, from qdn_db.machines (separate connection).
        // Adjust the connection name / table / column below if they differ.
        $machineIds = DB::connection('qdn_db')->table('machine_list')->pluck('id', 'machine_num');

        $missingPackages = [];
        $missingMachines = [];

        DB::transaction(function () use ($packageIds, $machineIds, &$missingPackages, &$missingMachines) {
            foreach ($this->rows as $row) {
                $machineId = $machineIds[$row['machine_num']] ?? null;
                if ($machineId === null) {
                    $missingMachines[] = $row['machine_num'];
                    continue;
                }

                $capabilityId = DB::table('machine_capability_configs')->insertGetId([
                    'machine_id' => $machineId,
                    'process_type' => $row['process_type'] ?? null,
                    'remarks' => $row['remarks'],
                ], 'capability_id');

                foreach ($row['leadcounts'] ?? [] as $lc) {
                    foreach ($lc['values'] as $value) {
                        DB::table('machine_capability_leadcounts')->insert([
                            'capability_id' => $capabilityId,
                            'leadcount' => $value,
                            'mode' => $lc['mode'],
                        ]);
                    }
                }

                foreach ($row['packages'] as $pkg) {
                    $packageId = $packageIds[$pkg['package']] ?? null;
                    if ($packageId === null) {
                        $missingPackages[] = $pkg['package'];
                        continue;
                    }

                    $capabilityPackageId = DB::table('machine_capability_packages')->insertGetId([
                        'capability_id' => $capabilityId,
                        'package_id' => $packageId,
                        'required_factory' => $pkg['required_factory'],
                    ]);

                    foreach ($pkg['dims'] as $dim) {
                        DB::table('machine_capability_dimensions')->insert([
                            'capability_package_id' => $capabilityPackageId,
                            'body_size' => $dim, // already sanitized/pre-sorted in the data above
                        ]);
                    }
                }
            }
        });

        if (! empty($missingMachines)) {
            $this->command?->warn('Skipped rows for unknown machine_num values: ' . implode(', ', array_unique($missingMachines)));
        }

        if (! empty($missingPackages)) {
            $this->command?->warn('Skipped package rows for unknown package names: ' . implode(', ', array_unique($missingPackages)));
        }
    }
}
