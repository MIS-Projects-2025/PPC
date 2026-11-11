<?php

namespace Database\Seeders;

use App\Models\BoxDimension;
use Illuminate\Database\Seeder;

class BoxDimensionSeeder extends Seeder
{
    // [type, length, height]
    private const BOXES = [
        ['pizza box big', 37, 7],
        ['pizza box big', 37, 6],
        ['pizza box big', 37, 5],
        ['pizza box big', 34, 3],

        ['pizza box medium', 22, 5.5],
        ['pizza box medium', 22, 4.5],

        ['pizza box small', 20, 3],
        ['pizza box small', 15, 3],

        ['brown box long', 13.5, 8.5],
        ['brown box long', 13, 8.5],
        ['brown box long', 10.5, 5.5],

        ['brown box normal', 17.5, 9],
        ['brown box normal', 17, 6],
        ['brown box normal', 18.5, 5.5],
    ];

    public function run(): void
    {
        foreach (self::BOXES as [$type, $length, $height]) {
            $name = "{$type} {$this->fmt($length)} x {$this->fmt($height)}";

            if (BoxDimension::where('name', $name)->exists()) {
                continue; // seeded already; the CRUD page owns it from here
            }

            // Adopt a pre-name row with the same size so lot_stagings keep pointing at it.
            $box = BoxDimension::where('name', 'like', 'legacy-%')
                ->where('length', $length)
                ->where('height', $height)
                ->first()
                ?? new BoxDimension(['depth_units' => 2]);

            $box->fill(['name' => $name, 'length' => $length, 'height' => $height])->save();
        }
    }

    private function fmt(float|int $v): string
    {
        return rtrim(rtrim(number_format($v, 1, '.', ''), '0'), '.');
    }
}
