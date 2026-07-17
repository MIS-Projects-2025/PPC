<?php

namespace App\Services;

class PackageGroups
{
    public const GROUPS = [
        'RN' => ['QSOP', 'QSOP_EP', 'SOIC_N', 'SOIC_N_EP'],
        'MSOP' => ['MINI_SO', 'MINI_SO_EP'],
        'QFP/BGA' => [
            'BGA',
            'BGA_CAV',
            'BGA_ED',
            'CBGA',
            'CSP_BGA',
            'LGA',
            'LGA_CAV',
            'LQFN',
            'LQFN_EP',
            'LQFP',
            'LQFP_EP',
            'TQFP',
            'TQFP_EP',
            'WLBGA',
            'MQFP',
            'SOIC_CAV',
            'LCC',
            'LCC_HS',
        ],
        'CSP' => ['LFCSP', 'LFCSP_CAV', 'LFCSP_RT', 'LFCSP_SS'],
        'SOT/TSOT/SC' => ['SOT_23', 'SOT_23_3', 'SOT_89', 'SOT-223', 'SOT-23', 'TSOT', 'SC70'],
        'QFN/DFN' => ['DFN', 'GQFN', 'QFN', 'UTQFN'],
        'PLCC' => ['PLCC'],
        'T0' => ['TO', 'TO220', 'TO-220', 'TO-46', 'TO92', 'TO-92'],
        'RU' => ['TSSOP', 'TSSOP_4.4', 'TSSOP_4.4_EP', 'TSSOP_6.1', 'TSSOP-W'],
        'RS' => ['SSOP', 'SSOP-W'],
        'DDPAK' => ['DDPAK'],
        'BRAND' => ['CERDIP', 'SBDIP', 'CERPACK', 'CERPAK', 'FLATPACK'],
        'CHIP' => ['CHIP'],
        'LPI' => ['MCML', 'MSML'],
        'PDIP' => ['PDIP'],
        'RW' => ['PSOP_3', 'SOIC_IC', 'SOIC_W', 'SOIC_W_FP'],
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
