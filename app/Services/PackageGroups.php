<?php

namespace App\Services;

class PackageGroups
{
    public const GROUPS = [
        'RN' => ['QSOP', 'QSOP_EP', 'SOIC_N', 'SOIC_N_EP'],
        'SOT' => [
            'SOT-223',
            'SOT_23',
            'SOT_23_3',
            'SOT_89',
            'SOT-23',
        ],
        'PLCC' => ['PLCC'],
        'TO' => ['TO', 'TO220', 'TO-220', 'TO-46', 'TO46', 'TO92', 'TO-92'],
        'RU' => ['TSSOP', 'TSSOP_4.4', 'TSSOP_4.4_EP', 'TSSOP_6.1', 'TSSOP-W'],
        'RM' => ['MINI_SO', 'MINI_SO_EP'],
        'SSOP' => ['SSOP', 'SSOP-W'],
        'DDPAK' => ['DDPAK'],
        'MANUAL_' => [
            'JLCC',
            'LDCC',
            'MCML',
            'MSML',
        ],
        'PDIP' => ['PDIP'],
        'RW' => [
            'SOIC_IC',
            'SOIC_W',
            'SOIC_W_FP'
        ],
        'Brand' => [
            'SBDIP',
            'CERDIP',
            'CERPACK',
            'CERPAK',
            'CHIP',
            'CLCC',
            'FLATPACK',
        ],
        'Turret' => ['DFN', 'GQFN', 'SC70', 'TSOT', 'UTQFN', 'QFN'],
        'Tray' => [
            'BGA',
            'BGA_CAV',
            'BGA_ED',
            'CBGA',
            'CSP_BGA',
            'LCC',
            'LCC_HS',
            'LCC_V',
            'LFCSP',
            'LFCSP_CAV',
            'LFCSP_RT',
            'LFCSP_SS',
            'LGA',
            'LGA_CAV',
            'LQFN',
            'LQFN_EP',
            'LQFP',
            'LQFP_ED',
            'LQFP_EP',
            'MQFP',
            'SOIC_CAV',
            'TQFP',
            'TQFP_EP',
            'WLBGA',
        ],
    ];

    private static ?array $reverseMap = null;

    public static function groupOf(?string $packageName): ?string
    {
        if (!$packageName) return $packageName;

        if (self::$reverseMap === null) {
            self::$reverseMap = [];
            foreach (self::GROUPS as $group => $members) {
                foreach ($members as $member) {
                    self::$reverseMap[$member] = $group;
                }
            }
        }

        return self::$reverseMap[$packageName] ?? $packageName;
    }
}
