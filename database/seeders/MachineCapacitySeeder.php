<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class MachineCapacitySeeder extends Seeder
{
    // Inserted 193 machine_capacities rows.
    // Skipped duplicate machine_code entries in source data: 02HSI400T (capacity 80000)
    // Skipped rows for unknown machine_code values (not found in machine_list): 01MV853A, 11AT128, 01SRM, 04MV853A, 10AT128, 02MV853A,
    // O4STI, 10HEXA Whizz, SILLNEAR AG1105, ST58521, ST58531

    /**
     * [capacity, machine_code] pairs, straight from the source list.
     *
     * NOTE: '31HSI250' appears twice in the source with two different
     * capacities (79,600 and 79,724). Since machine_capacities is meant
     * to hold exactly one open-ended (effective_to IS NULL) row per
     * machine at a time, both can't be seeded as "current" — that would
     * make capacity lookups ambiguous. Only the FIRST occurrence
     * (79,600) is seeded below; the second is skipped with a warning.
     * Confirm which value is actually correct and re-run if needed.
     */
    private array $rows = [
        [10000, '01ST60'],
        [48884, '01V12'],
        [45258, '01VITROX'],
        [40000, '02AT268'],
        [79724, '02HSI200'],
        [79035, '02HSI400T'],
        [79724, '03HSI200'],
        [106050, '03HSI400T'],
        [79035, '03VITROX'],
        [79035, '04HSI200'],
        [27560, '04HSI400T'],
        [45258, '04VITROX'],
        [10000, '05HSI200'],
        [79035, '05HSI400T'],
        [66059, '05VITROX'],
        [48884, '06HSI400T'],
        [10000, '06ST60'],
        [79035, '06VITROX'],
        [48884, '07HSI400T'],
        [14671, '07VITROX'],
        [14671, '08HEXA'],
        [48884, '08HSI400T'],
        [40000, '08ST60'],
        [79035, '09HSI400T'],
        [40000, '09ST60'],
        [14671, '10HEXA'],
        [10000, '10HSI250'],
        [79035, '10HSI400T'],
        [40000, '10ST60'],
        [45258, '10VITROX'],
        [79724, '11HSI250'],
        [79035, '11HSI400i'],
        [45258, '11VITROX'],
        [10000, '12HEXA'],
        [79035, '12HSI400i'],
        [48884, '13HSI250'],
        [106050, '13HSI400i'],
        [79035, '14HSI400i'],
        [45258, '14VITROX'],
        [14000, '15HSI250'],
        [14000, '15VITROX'],
        [14671, '16HEXA'],
        [79035, '18HSI250'],
        [45258, '18VITROX'],
        [79035, '19HSI250'],
        [45258, '19VITROX'],
        [106050, '20HSI250'],
        [80000, '20VITROX'],
        [14671, '21HEXA'],
        [79724, '21HSI250'],
        [66059, '21VITROX'],
        [14671, '22HEXA'],
        [106050, '22HSI250'],
        [14000, '22VITROX'],
        [45258, '23HEXA'],
        [106050, '23HSI250'],
        [79035, '23VITROX'],
        [25647, '24HEXA'],
        [106050, '24HSI250'],
        [106050, '24VITROX'],
        [14671, '25HEXA'],
        [27560, '25HSI250'],
        [79035, '25VITROX'],
        [45258, '26HEXA'],
        [79035, '26HSI250'],
        [45258, '27VITROX'],
        [79724, '28HSI250'],
        [79035, '29HSI250'],
        [14000, '29HSI400T'],
        [79600, '31HSI250'],
        [79724, '32HSI250'],
        [79724, '34HSI250'],
        [14000, '35HSI250'],
        [79035, '36HSI250'],
        [48884, '37HSI250'],
        [20000, '44G6L'],
        [80000, '49VITROX'],
        [25647, '50VITROX'],
        [79035, '51VITROX'],
        [45258, '53VITROX'],
        [45258, '54VITROX'],
        [45258, '55VITROX'],
        [10000, '56AT28'],
        [79035, '56VITROX'],
        [45258, '59VITROX'],
        [106050, '62VITROX'],
        [106050, '63VITROX'],
        [45258, '65VITROX'],
        [60000, '66VITROX'],
        [10000, '70AT28'],
        [25647, '01MV853A'],
        [25647, '11AT128'],
        [80000, '04G6L'],
        [80000, '05G6L'],
        [80000, '06G6L'],
        [80000, '07G6L'],
        [80000, '12G6L'],
        [80000, '21G6L'],
        [80000, '38G6L'],
        [80000, '39G6L'],
        [80000, '43G6L'],
        [80000, '57G6L'],
        [10000, '01MV883'],
        [80000, '02AT468'],
        [80000, '06HSI200'],
        [80000, '10G6L'],
        [80000, '13G6L'],
        [58231, '19AT128'],
        [58231, '21AT128'],
        [58231, '25AT128'],
        [58231, '30AT128'],
        [80000, '33G6L'],
        [80000, '42G6L'],
        [58231, '45AT28'],
        [80000, '47G6L'],
        [58231, '48AT28'],
        [58231, '51AT28'],
        [80000, '54G6L'],
        [58231, '58AT28'],
        [80000, '01SRM'],
        [58231, '04MV853A'],
        [80000, '08G6L'],
        [80000, '09G6L'],
        [80000, '11G6L'],
        [50478, '15AT128'],
        [80000, '36G6L'],
        [50478, '39AT28'],
        [80000, '48G6L'],
        [80000, '53G6L'],
        [50478, '10AT128'],
        [50478, '02MV853A'],
        [80000, '50G6L'],
        [80000, '02G6L'],
        [50478, '27AT28'],
        [50478, '29AT128'],
        [50478, '29AT28'],
        [50478, '34AT28'],
        [80000, '34G6L'],
        [50478, '44AT28'],
        [50478, '52AT28'],
        [50478, 'O4STI'],
        [25647, '10HEXA Whizz'],
        [80000, '20G6L'],
        [80000, '24G6L'],
        [80000, '26G6L'],
        [80000, '27G6L'],
        [80000, '28G6L'],
        [80000, '40G6L'],
        [80000, '45G6L'],
        [80000, '58G6L'],
        [80000, '62G6L'],
        [80000, '07HSI200'],
        [80000, '09HSI200'],
        [80000, '29G6L'],
        [80000, '33HSI250'],
        [80000, '41G6L'],
        [80000, '32G6L'],
        [80000, '49G6L'],
        [80000, '31G6L'],
        [80000, '30G6L'],
        [80000, '51G6L'],
        [58231, 'AT128040'],
        [80000, '30HSI250'],
        [10000, '01HSTNR'],
        [70000, '56G6L'],
        [70000, 'AT128042'],
        [70000, 'AT128043'],
        [70000, '19G6L'],
        [70000, '61G6L'],
        [70000, 'AT128039'],
        [70000, 'AT128041'],
        [70000, 'AT128044'],
        [24000, 'AT28019'],
        [24000, 'AT28020'],
        [39862, '15G6L'],
        [39862, '17G6L'],
        [24000, 'AT28038'],
        [37574, '17AT128'],
        [37574, 'AT128045'],
        [80000, '59G6L'],
        [70000, '37G6L'],
        [70000, '46G6L'],
        [70000, '55G6L'],
        [37574, '52G6L'],
        [37574, '16G6L'],
        [43560, '28VITROX'],
        [43560, '09VITROX'],
        [43560, '41VITROX'],
        [43560, '52VITROX'],
        [80000, '12VITROX'],
        [80000, '16VITROX'],
        [80000, '45VITROX'],
        [80000, '46VITROX'],
        [106050, '02VITROX'],
        [106050, '43VITROX'],
        [106050, '44VITROX'],
        [60000, '47VITROX'],
        [60000, '48VITROX'],
        [106050, '64VITROX'],
        [106050, '16HSI250'],
        [43560, '26VITROX'],
        [50000, 'SILLNEAR AG1105'],
        [30000, 'ST58521'],
        [30000, 'ST58531']
    ];

    public function run(): void
    {
        // ASSUMPTION: machine_capacities lives in the same database as
        // machine_list (its FK target), i.e. the qdn_db connection.
        // Adjust the connection name below if that's wrong.
        $connection = DB::connection('qdn_db');

        $machineIds = $connection->table('machine_list')->pluck('id', 'machine_num');
        // ^ ASSUMPTION: machine_list's code column is named `code` and
        // matches the machine_code values in $rows (e.g. '01ST60').
        // Adjust the column name if machine_list uses something else.

        $today = Carbon::today()->toDateString();

        $missingMachines = [];
        $seenCodes = [];
        $skippedDuplicates = [];
        $inserted = 0;

        $connection->transaction(function () use ($connection, $machineIds, $today, &$missingMachines, &$seenCodes, &$skippedDuplicates, &$inserted) {
            foreach ($this->rows as [$capacity, $machineCode]) {
                if (isset($seenCodes[$machineCode])) {
                    $skippedDuplicates[] = "$machineCode (capacity $capacity)";
                    continue;
                }
                $seenCodes[$machineCode] = true;

                $machineId = $machineIds[$machineCode] ?? null;
                if ($machineId === null) {
                    $missingMachines[] = $machineCode;
                    continue;
                }

                $connection->table('machine_capacities')->insert([
                    'machine_id' => $machineId,
                    'capacity' => $capacity,
                    'effective_from' => $today,
                    'effective_to' => null,
                ]);
                $inserted++;
            }
        });

        $this->command?->info("Inserted {$inserted} machine_capacities rows.");

        if (! empty($skippedDuplicates)) {
            $this->command?->warn('Skipped duplicate machine_code entries in source data: ' . implode(', ', $skippedDuplicates));
        }

        if (! empty($missingMachines)) {
            $this->command?->warn('Skipped rows for unknown machine_code values (not found in machine_list): ' . implode(', ', $missingMachines));
        }
    }
}
