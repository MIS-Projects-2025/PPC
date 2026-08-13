<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class PackageReferenceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $packages = [
            '150mils' => 'PL1',
            'BGA' => 'PL6',
            'BGA_CAV' => 'PL6',
            'BGA_ED' => 'PL6',
            'CBGA' => 'PL6',
            'CERDIP' => 'PL1',
            'CERPACK' => 'PL1',
            'CERPAK' => 'PL1',
            'CHIP' => 'PL1',
            'CLCC' => 'PL1',
            'CQFP' => 'PL6',
            'CSP_BGA' => 'PL6',
            'DDPAK' => 'PL1',
            'DFN' => 'PL6',
            'EMGA' => 'PL6',
            'FC2QFN' => 'PL6',
            'FCCSP' => 'PL6',
            'FCQFN' => 'PL6',
            'FLATPACK' => 'PL1',
            'FLATPAK' => 'PL1',
            'GQFN' => 'PL6',
            'LCC' => 'PL6',
            'LCC_HS' => 'PL6',
            'LCC_V' => 'PL6',
            'LDCC' => 'PL1',
            'LFCSP' => 'PL6',
            'LFCSP_CAV' => 'PL6',
            'LFCSP_RT' => 'PL6',
            'LFCSP_SS' => 'PL6',
            'LGA' => 'PL6',
            'LGA_CAV' => 'PL6',
            'LQFN' => 'PL6',
            'LQFN_EP' => 'PL6',
            'LQFP' => 'PL6',
            'LQFP_ED' => 'PL6',
            'LQFP_EP' => 'PL6',
            'MCML' => 'PL1',
            'MINI_SO' => 'PL1',
            'MINI_SO_EP' => 'PL1',
            'MQFP' => 'PL6',
            'MSML' => 'PL1',
            'MSOP' => 'PL1',
            'OFN' => 'PL6',
            'OLGA' => 'PL6',
            'PCA' => 'PL1',
            'PDIP' => 'PL1',
            'PLCC' => 'PL1',
            'PSOP_3' => 'PL1',
            'QFN' => 'PL6',
            'QFP' => 'PL6',
            'QSOP' => 'PL1',
            'QSOP_EP' => 'PL1',
            'QSOP/RN' => 'PL1',
            'RW' => 'PL1',
            'SBDIP' => 'PL1',
            'SC70' => 'PL6',
            'SOIC_CAV' => 'PL6',
            'SOIC_IC' => 'PL1',
            'SOIC_N' => 'PL1',
            'SOIC_N_EP' => 'PL1',
            'SOIC_W' => 'PL1',
            'SOIC_W_FP' => 'PL1',
            'SOT' => 'PL6',
            'SOT_23' => 'PL6',
            'SOT_23_3' => 'PL6',
            'SOT_89' => 'PL6',
            'SOT-223' => 'PL1',
            'SOT-23' => 'PL6',
            'SOT223' => 'PL1',
            'SSOP' => 'PL1',
            'SSOP_W' => 'PL1',
            'SSOP-W' => 'PL1',
            'TO' => 'PL1',
            'TO-220' => 'PL6',
            'TO-46' => 'PL6',
            'TO-92' => 'PL6',
            'TO220' => 'PL1',
            'TO46' => 'PL1',
            'TO92' => 'PL1',
            'TQFP' => 'PL6',
            'TQFP_EP' => 'PL6',
            'TSOC' => 'PL6',
            'TSOT' => 'PL6',
            'TSSOP' => 'PL1',
            'TSSOP_4.4' => 'PL1',
            'TSSOP_4.4_EP' => 'PL1',
            'TSSOP_6.1' => 'PL1',
            'TSSOP-W' => 'PL1',
            'UMAX' => 'PL1',
            'UTQFN' => 'PL6',
            'WLBGA' => 'PL6',
            'WLCSP' => 'PL1',
        ];

        $now = Carbon::now();

        $rows = collect($packages)
            ->map(function (string $productionLine, string $package) use ($now) {
                return [
                    'package' => $package,
                    'production_line' => $productionLine,
                ];
            })
            ->values()
            ->all();

        // Chunk inserts to be safe on very large datasets; upsert keeps it idempotent
        // (package is the primary key), so re-running the seeder just updates values.
        collect($rows)->chunk(100)->each(function ($chunk) {
            DB::table('ppc_productionline_packagereference')->upsert(
                $chunk->all(),
                ['package'],
                ['production_line']
            );
        });
    }
}
