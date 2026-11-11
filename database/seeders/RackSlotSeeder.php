<?php

namespace Database\Seeders;

use App\Models\Rack;
use App\Models\RackSlot;
use Illuminate\Database\Seeder;

class RackSlotSeeder extends Seeder
{
    private const RACK_LABEL = 'Rack-PL6';
    private const SLOTS_PER_RACK = 4;

    public function run(): void
    {
        $rackId = Rack::where('label', self::RACK_LABEL)->value('id');

        if (! $rackId) {
            $this->command?->error('Rack ' . self::RACK_LABEL . ' not found.');
            return;
        }

        // Dimension groups: racks => length + height per slot (1-4, or one value for all)
        $groups = [
            [
                'racks'   => ['I', 'J', 'K', 'L', 'E', 'F', 'G', 'H'],
                'length'  => 120,
                'heights' => [1 => 64, 2 => 55, 3 => 53, 4 => 53],
            ],
            [
                'racks'   => ['A', 'B', 'C', 'D'],
                'length'  => 120,
                'heights' => [1 => 66, 2 => 46, 3 => 48, 4 => 46],
            ],
            [
                'racks'   => [
                    'U',
                    'V',
                    'W',
                    'M',
                    'N',
                    'AV',
                    'AU',
                    'Z',
                    'Y',
                    'X',
                    'AW',
                    'R',
                    'AX',
                    'S',
                    'AY',
                    'T',
                    'AF',
                    'AZ',
                    'AQ',
                    'AR',
                    'AS',
                    'AT'
                ],
                'length'  => 86,
                'heights' => array_fill(1, self::SLOTS_PER_RACK, 37),
            ],
            [
                'racks'   => ['O', 'P', 'Q'],
                'length'  => 119,
                'heights' => array_fill(1, self::SLOTS_PER_RACK, 70),
            ],
        ];

        $untracked = [
            'AA',
            'AB',
            'AC',
            'AD',
            'AH',
            'AG',
            'AF',
            'AE',
            'AI',
            'AJ',
            'AK',
            'AL',
            'AM',
            'AN',
            'AO',
            'AP',
        ];

        // Build label => attributes
        $slots = [];

        foreach ($groups as $group) {
            foreach ($group['racks'] as $rack) {
                foreach ($group['heights'] as $n => $height) {
                    $slots[$rack . $n] = [
                        'length'  => $group['length'],
                        'height'  => $height,
                        'tracked' => 1,
                    ];
                }
            }
        }

        foreach ($untracked as $rack) {
            for ($n = 1; $n <= self::SLOTS_PER_RACK; $n++) {
                // Keep dimensions if the rack has them (e.g. AF), just flip tracked off
                $slots[$rack . $n] = ($slots[$rack . $n] ?? []) + ['tracked' => 0];
                $slots[$rack . $n]['tracked'] = 0;
            }
        }

        foreach ($slots as $label => $attrs) {
            RackSlot::updateOrCreate(
                ['rack_id' => $rackId, 'label' => $label],
                $attrs
            );
        }
    }
}
