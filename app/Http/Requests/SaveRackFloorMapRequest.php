<?php

namespace App\Http\Requests;

use App\Models\Rack;
use App\Models\RackPage;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class SaveRackFloorMapRequest extends FormRequest
{
    public const MAX_FLOOR = 80; // keep in sync with MAX_FLOOR in RackLayoutEditor.jsx

    public function authorize(): bool
    {
        // Access is controlled by the middleware group on the route.
        return true;
    }

    public function rules(): array
    {
        return [
            'width'                => ['required', 'integer', 'between:1,' . self::MAX_FLOOR],
            'height'               => ['required', 'integer', 'between:1,' . self::MAX_FLOOR],
            'blocks'               => ['present', 'array', 'max:500'],
            'blocks.*.rack_id'     => ['required', 'integer'],
            'blocks.*.shelf_label' => ['required', 'string', 'max:10'],
            'blocks.*.x'           => ['required', 'integer', 'min:0'],
            'blocks.*.y'           => ['required', 'integer', 'min:0'],
            'blocks.*.w'           => ['required', 'integer', 'between:1,10'],
            'blocks.*.h'           => ['required', 'integer', 'between:1,10'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($v->errors()->isNotEmpty()) {
                return; // shape errors first; the checks below assume a valid shape
            }

            $page   = RackPage::where('key', strtoupper((string) $this->route('productionLine')))->first();
            $blocks = collect($this->input('blocks', []))->values();
            $width  = (int) $this->input('width');
            $height = (int) $this->input('height');

            if (! $page) {
                $v->errors()->add('blocks', 'Rack page not found.');
                return;
            }

            // 1. every rack must belong to this rack page
            $allowed = Rack::where('rack_page_id', $page->id)
                ->whereIn('id', $blocks->pluck('rack_id')->unique())
                ->pluck('id');

            // 2. one block per (rack, shelf)
            $seen = [];

            foreach ($blocks as $i => $b) {
                if (! $allowed->contains($b['rack_id'])) {
                    $v->errors()->add("blocks.$i.rack_id", "Rack {$b['rack_id']} does not belong to this rack page.");
                }

                $key = $b['rack_id'] . ':' . $b['shelf_label'];
                if (isset($seen[$key])) {
                    $v->errors()->add("blocks.$i.shelf_label", "Shelf {$b['shelf_label']} is placed more than once.");
                }
                $seen[$key] = true;

                // 3. fully inside the floor
                if ($b['x'] + $b['w'] > $width || $b['y'] + $b['h'] > $height) {
                    $v->errors()->add("blocks.$i.x", "Shelf {$b['shelf_label']} is outside the floor.");
                }
            }

            if ($v->errors()->isNotEmpty()) {
                return;
            }

            // 4. no two blocks may overlap
            $count = $blocks->count();
            for ($i = 0; $i < $count; $i++) {
                for ($j = $i + 1; $j < $count; $j++) {
                    $a = $blocks[$i];
                    $b = $blocks[$j];

                    if (
                        $a['x'] < $b['x'] + $b['w'] && $a['x'] + $a['w'] > $b['x'] &&
                        $a['y'] < $b['y'] + $b['h'] && $a['y'] + $a['h'] > $b['y']
                    ) {
                        $v->errors()->add(
                            "blocks.$j.x",
                            "Shelves {$a['shelf_label']} and {$b['shelf_label']} overlap."
                        );
                        return; // one message is enough
                    }
                }
            }
        });
    }
}
