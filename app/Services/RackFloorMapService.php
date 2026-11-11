<?php

namespace App\Services;

use App\Models\RackFloorBlock;
use App\Models\RackFloorMap;
use App\Models\RackPage;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class RackFloorMapService
{
    /**
     * Shape sent to the frontend. A page with no saved map yet gets the defaults
     * and id = null (nothing is written on a GET).
     */
    public function forPage(RackPage $page): array
    {
        $map = RackFloorMap::with('blocks')->where('rack_page_id', $page->id)->first();

        return $this->present($page, $map);
    }

    /**
     * Same shape for several pages (e.g. the "all racks" screens), with one query for the maps.
     *
     * @param  Collection<int, RackPage>  $pages
     */
    public function forPages(Collection $pages): array
    {
        $maps = RackFloorMap::with('blocks')
            ->whereIn('rack_page_id', $pages->pluck('id'))
            ->get()
            ->keyBy('rack_page_id');

        return $pages->map(fn(RackPage $page) => $this->present($page, $maps->get($page->id)))
            ->values()
            ->all();
    }

    /**
     * @return array{rack_page_id: int, key: string, id: int|null, width: int, height: int, blocks: array<int, array<string, int|string>>}
     */
    private function present(RackPage $page, ?RackFloorMap $map): array
    {
        return [
            'rack_page_id' => $page->id,
            'key'          => $page->key,
            'id'           => $map?->id,
            'width'        => $map?->width ?? RackFloorMap::DEFAULT_WIDTH,
            'height'       => $map?->height ?? RackFloorMap::DEFAULT_HEIGHT,
            'blocks'       => $map
                ? $map->blocks->map(fn(RackFloorBlock $b) => [
                    'rack_id'     => $b->rack_id,
                    'shelf_label' => $b->shelf_label,
                    'x'           => $b->x,
                    'y'           => $b->y,
                    'w'           => $b->w,
                    'h'           => $b->h,
                ])->values()->all()
                : [],
        ];
    }

    /**
     * Replace the whole map of a page in one transaction.
     * The request has already validated bounds, overlaps and rack ownership.
     *
     * @param  array{width: int, height: int, blocks: array<int, array<string, mixed>>}  $data
     */
    public function save(RackPage $page, array $data): array
    {
        return DB::transaction(function () use ($page, $data) {
            $map = RackFloorMap::updateOrCreate(
                ['rack_page_id' => $page->id],
                ['width' => $data['width'], 'height' => $data['height']],
            );

            $map->blocks()->delete();

            $now  = now();
            $rows = collect($data['blocks'])->map(fn(array $b) => [
                'rack_floor_map_id' => $map->id,
                'rack_id'           => $b['rack_id'],
                'shelf_label'       => $b['shelf_label'],
                'x'                 => $b['x'],
                'y'                 => $b['y'],
                'w'                 => $b['w'],
                'h'                 => $b['h'],
                'created_at'        => $now,
                'updated_at'        => $now,
            ])->all();

            if ($rows) {
                RackFloorBlock::insert($rows);
            }

            return $this->forPage($page);
        });
    }
}
