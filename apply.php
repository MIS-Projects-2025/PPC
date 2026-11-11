<?php

/**
 * Applies the "shared boxes / box group" find-and-replace edits (items 2-11) in one go.
 *
 * Run from the project root:
 *   php apply-box-group-patch.php --dry-run     # preview, writes nothing
 *   php apply-box-group-patch.php               # apply
 *
 * Options:
 *   --root=/path/to/project     project root (default: current directory)
 *   --pick=ID=N                 when a Find text matches several places, use the Nth match (1-based).
 *                               Repeatable, e.g.  --pick=10d=2 --pick=10e=1
 *
 * Behaviour:
 *   - Matching ignores differences in whitespace/indentation (the Find text is a token sequence).
 *   - Safe to re-run: edits whose Replace text is already in the file are skipped.
 *   - An edit that is not found, or is ambiguous without --pick, is reported and skipped;
 *     all other edits in that file are still applied. Re-run with --pick to finish.
 *   - Preserves CRLF line endings if the file uses them.
 *   - Use git to review/revert (git diff / git checkout .).
 */

declare(strict_types=1);

$opt   = getopt('', ['dry-run', 'root:', 'pick:']);
$dry   = isset($opt['dry-run']);
$root  = rtrim((string) ($opt['root'] ?? getcwd()), '/\\');
$picks = [];
foreach ((array) ($opt['pick'] ?? []) as $p) {
    if (preg_match('/^(\w+)=(\d+)$/', (string) $p, $m)) {
        $picks[$m[1]] = (int) $m[2];
    }
}

function flex(string $text): string
{
    $tokens = preg_split('/\s+/', trim($text));
    return '/' . implode('\s+', array_map(fn($t) => preg_quote($t, '/'), $tokens)) . '/';
}

// ---- parse the patch data at the bottom of this file ----
$data  = file_get_contents(__FILE__, false, null, __COMPILER_HALT_OFFSET__);
$edits = [];
$file  = null;
$cur   = null;
$mode  = null;

foreach (preg_split('/\R/', $data) as $line) {
    if (str_starts_with($line, '@@@ FILE ')) {
        $file = trim(substr($line, 9));
        $cur = $mode = null;
        continue;
    }
    if (str_starts_with($line, '@@@ EDIT ')) {
        $cur = count($edits);
        $edits[] = ['id' => trim(substr($line, 9)), 'file' => $file, 'find' => [], 'replace' => []];
        $mode = null;
        continue;
    }
    if ($line === '--- find') {
        $mode = 'find';
        continue;
    }
    if ($line === '--- replace') {
        $mode = 'replace';
        continue;
    }
    if ($cur !== null && $mode !== null) {
        $edits[$cur][$mode][] = $line;
    }
}

// drop trailing blank lines of each block (they are only separators in this file)
foreach ($edits as &$e) {
    foreach (['find', 'replace'] as $k) {
        while ($e[$k] && trim(end($e[$k])) === '') {
            array_pop($e[$k]);
        }
    }
}
unset($e);

$byFile = [];
foreach ($edits as $e) {
    $byFile[$e['file']][] = $e;
}

$applied = $skipped = $problems = 0;
echo $dry ? "DRY RUN (nothing will be written)\n" : "Applying edits in {$root}\n";

foreach ($byFile as $rel => $list) {
    echo "\n{$rel}\n";
    $path = $root . '/' . $rel;

    if (!is_file($path)) {
        echo "  ✗ file not found\n";
        $problems += count($list);
        continue;
    }

    $content = file_get_contents($path);
    $crlf    = str_contains($content, "\r\n");
    $changed = false;

    foreach ($list as $e) {
        $id   = $e['id'];
        $find = implode("\n", $e['find']);
        // the match starts after the line's existing indentation, so drop the first line's own indent
        $rep  = str_replace('{TAB}', "\t", ltrim(implode("\n", $e['replace']), " \t"));

        if (preg_match(flex($rep), $content)) {
            echo "  – {$id}: already applied\n";
            $skipped++;
            continue;
        }

        $n = preg_match_all(flex($find), $content, $m, PREG_OFFSET_CAPTURE);

        if (!$n) {
            echo "  ✗ {$id}: Find text not found\n";
            $problems++;
            continue;
        }

        $idx = 0;
        if ($n > 1) {
            $pick = $picks[$id] ?? null;
            if ($pick === null || $pick < 1 || $pick > $n) {
                echo "  ✗ {$id}: Find text matches {$n} places. Re-run with --pick={$id}=N (N = 1..{$n}):\n";
                $lines = preg_split('/\R/', $content);
                foreach ($m[0] as $i => [$text, $off]) {
                    $ln = substr_count(substr($content, 0, $off), "\n") + 1;
                    echo '      ' . ($i + 1) . ") line {$ln}: " . trim($lines[$ln - 1] ?? '') . "\n";
                }
                $problems++;
                continue;
            }
            $idx = $pick - 1;
        }

        [$text, $off] = $m[0][$idx];
        $insert  = $crlf ? str_replace("\n", "\r\n", $rep) : $rep;
        $content = substr_replace($content, $insert, $off, strlen($text));
        $changed = true;
        $applied++;
        $ln = substr_count(substr($content, 0, $off), "\n") + 1;
        echo "  ✓ {$id}: applied (line {$ln})\n";
    }

    if ($changed && !$dry) {
        file_put_contents($path, $content);
    }
}

echo "\nDone. applied={$applied} already-applied={$skipped} problems={$problems}\n";
if ($problems) {
    echo "Fix the ✗ items (use --pick for ambiguous ones) and re-run; applied edits are skipped automatically.\n";
}
exit($problems ? 1 : 0);

__halt_compiler();
@@@ FILE app/Models/LotStaging.php

@@@ EDIT 2
--- find
'box_count',
--- replace
'box_count',
        'box_group_id',

@@@ FILE app/Repositories/LotRepository.php

@@@ EDIT 3a
--- find
'box_count'    => $boxCount,
--- replace
'box_count'    => $boxCount,
            'box_group_id' => $extra['box_group_id'] ?? null,

@@@ EDIT 3b
--- find
$slots = RackSlot::with('rack')->whereIn('id', $slotIds)->get()->keyBy('id');
--- replace
// New boxes start their own group. Lots sharing boxes pass the existing group id in $extra.
        if (!$staging->box_group_id) {
            $staging->update(['box_group_id' => $staging->id]);
        }

        $slots = RackSlot::with('rack')->whereIn('id', $slotIds)->get()->keyBy('id');

@@@ EDIT 3c
--- find
public function update(int $id, array $data): Lot
--- replace
public function update(int $id, array $data, bool $syncGroup = true): Lot

@@@ EDIT 3d
--- find
$remaining = LotPosition::where('lot_staging_id', $activeStaging->id)->whereNull('released_at')->get();
--- replace
// Shared boxes physically move together: mirror this slot change onto every other lot in the group.
                    // $syncGroup = false stops the siblings from syncing back (infinite loop).
                    // FUTURE: if an "unlink from group" action is ever added, a lot that was unlinked
                    // simply gets its own box_group_id and is no longer found here.
                    if ($syncGroup && $activeStaging->box_group_id) {
                        LotStaging::where('box_group_id', $activeStaging->box_group_id)
                            ->where('id', '!=', $activeStaging->id)
                            ->whereNull('released_at')
                            ->pluck('lot_id')
                            ->each(fn($siblingLotId) => $this->update(
                                $siblingLotId,
                                ['slot_ids' => $slotIds, 'modified_by' => $modifiedBy],
                                false,
                            ));
                    }

                    $remaining = LotPosition::where('lot_staging_id', $activeStaging->id)->whereNull('released_at')->get();

@@@ FILE app/Repositories/LotPositionRepository.php

@@@ EDIT 4a
--- find
->join('lots', 'lots.id', '=', 'lot_positions.lot_id')
--- replace
->join('lots', 'lots.id', '=', 'lot_positions.lot_id')
            ->leftJoin('lot_stagings', 'lot_stagings.id', '=', 'lot_positions.lot_staging_id')

@@@ EDIT 4b
--- find
->select('lot_positions.rack_slot_id', 'lot_positions.lot_id as lot_pk', 'lots.lot_id as lot_code', 'lots.received_at')
--- replace
->select(
                'lot_positions.rack_slot_id',
                'lot_positions.lot_id as lot_pk',
                'lots.lot_id as lot_code',
                'lots.received_at',
                'lot_stagings.box_group_id',
                'lot_stagings.box_count as staging_box_count',
                'lot_stagings.dimension_id as staging_dimension_id',
            )

@@@ EDIT 4c
--- find
(int) $row->rack_slot_id,
--- replace
(int) $row->rack_slot_id,
            'box_group_id'               => $row->box_group_id ? (int) $row->box_group_id : null,
            'box_count'                  => $row->staging_box_count ? (int) $row->staging_box_count : null,
            'dimension_id'               => $row->staging_dimension_id ? (int) $row->staging_dimension_id : null,

@@@ FILE app/Services/RecommendationService.php

@@@ EDIT 5a
--- find
->with('staging:id,dimension_id')
--- replace
->with('staging:id,dimension_id,box_group_id')

@@@ EDIT 5b
--- find
$entries[] = ['dim' => $dim, 'boxes' => (int) $p->box_count, 'presumed' => $p->presumed_released_at !== null];
--- replace
// One entry per physical box set, however many lots share it (lots in one box group).
                $key = $p->staging?->box_group_id ?? 'p' . $p->id;

                $entries[$key] ??= ['dim' => $dim, 'boxes' => 0, 'presumed' => true];
                $entries[$key]['boxes']    = max($entries[$key]['boxes'], (int) $p->box_count);
                // Presumed gone only if every lot sharing the boxes is presumed gone.
                $entries[$key]['presumed'] = $entries[$key]['presumed'] && $p->presumed_released_at !== null;

@@@ EDIT 5c
--- find
public function shadow(array $actualSlotIds, ?int $dimensionId, ?int $boxCount, int $lotId): array
--- replace
public function shadow(array $actualSlotIds, ?int $dimensionId, ?int $boxCount, int $lotId, bool $sharesBoxes = false): array

@@@ EDIT 5d
--- find
$payload['rack_page_id'] = RackSlot::find($actualSlotIds[0])?->rack?->rack_page_id;
--- replace
$payload['rack_page_id'] = RackSlot::find($actualSlotIds[0])?->rack?->rack_page_id;

            if ($sharesBoxes) {
                return $payload; // no recommendation to judge: these boxes were already placed
            }

@@@ FILE app/Services/LotService.php

@@@ EDIT 6a
--- find
// lots can be placed in multiple slots, in different racks.
--- replace
// Same physical boxes as lots already in the rack: location and box facts come from the
            // group, never from the form.
            $group = !empty($data['box_group_id'])
                ? $this->resolveSharedGroup((int) $data['box_group_id'])
                : null;

            if ($group) {
                $data['slot_ids']     = $group['slot_ids'];
                $data['dimension_id'] = $group['dimension_id'];
                $data['box_count']    = $group['box_count'];
            }

            // lots can be placed in multiple slots, in different racks.

@@@ EDIT 6b
--- find
if (!$slot->isAvailable()) {
--- replace
// A full slot must not block a lot joining boxes that are already there.
                if (!$group && !$slot->isAvailable()) {

@@@ EDIT 6c
--- find
$shadow = $this->recommendations->shadow(
                $data['slot_ids'],
                $data['dimension_id'] ?? null,
                $data['box_count'] ?? null,
                $lot->id,
            );
--- replace
$shadow = $this->recommendations->shadow(
                $data['slot_ids'],
                $data['dimension_id'] ?? null,
                $data['box_count'] ?? null,
                $lot->id,
                sharesBoxes: (bool) $group,
            );

@@@ EDIT 6d
--- find
['dimension_id' => $data['dimension_id'] ?? null, 'box_count' => $data['box_count'] ?? null],
--- replace
[
                    'dimension_id' => $data['dimension_id'] ?? null,
                    'box_count'    => $data['box_count'] ?? null,
                    'box_group_id' => $group['id'] ?? null, // null = new boxes = new group
                ],

@@@ EDIT 6e
--- find
$this->recommendations->record($staging, $shadow, $data['recommendation_id'] ?? null);
--- replace
$this->recommendations->record($staging, $shadow, $group ? null : ($data['recommendation_id'] ?? null));

@@@ EDIT 6f
--- find
'lot' => 'No staged lot found for this scan. It may have already been released.',
--- replace
'lot' => $this->releasedTogetherNote($lotId, $now)
                            ?? 'No staged lot found for this scan. It may have already been released.',

@@@ EDIT 6g
--- find
$staging->update([
--- replace
// Boxes shared by several lots leave the rack together: release the whole group with the same
                // withdrawer, in this one transaction.
                // FUTURE: a "release only this lot" option would skip this block. If it is ever added, it
                // needs an "unlink from group" action too, or the remaining lots are left staged in a slot
                // whose boxes are gone.
                $siblings = $staging->box_group_id
                    ? LotStaging::where('box_group_id', $staging->box_group_id)
                        ->where('id', '!=', $staging->id)
                        ->whereNull('released_at')
                        ->lockForUpdate()
                        ->get()
                    : collect();

                if ($siblings->isNotEmpty()) {
                    // Their slots must be known before their positions are released below.
                    $rackSlotIds = array_values(array_unique(array_merge(
                        $rackSlotIds,
                        LotPosition::whereIn('lot_staging_id', $siblings->pluck('id'))
                            ->whereNull('released_at')
                            ->pluck('rack_slot_id')
                            ->all(),
                    )));
                }

                foreach ($siblings as $sibling) {
                    $sibling->update([
                        'released_at'   => $now,
                        'released_by'   => $releasedBy,
                        'withdrawer_id' => $withdrawerId,
                    ]);

                    $this->positions->releaseByLot($sibling->lot_id, $releasedBy);
                    $this->lots->update($sibling->lot_id, [
                        'status'      => 'released',
                        'released_by' => $releasedBy,
                        'released_at' => $now,
                    ]);
                }

                $staging->update([

@@@ EDIT 6h
--- find
return $updated->fresh(['stagings.withdrawer', 'stagings.positions.rackSlot.rack', 'modifiedBy', 'receivedBy']);
--- replace
$fresh = ['stagings.withdrawer', 'stagings.positions.rackSlot.rack', 'modifiedBy', 'receivedBy'];

                $result = $updated->fresh($fresh);

                // The other lots released with it, so the frontend can update their rows.
                $result->setAttribute(
                    'also_released',
                    $siblings->isEmpty()
                        ? collect()
                        : Lot::with($fresh)->whereIn('id', $siblings->pluck('lot_id'))->get(),
                );

                return $result;

@@@ EDIT 6i
--- find
public function downloadFilteredExport(array $filters, $rackPageId)
--- replace
// The chosen group must still have lots in the rack. Location and box facts come from it.
    private function resolveSharedGroup(int $groupId): array
    {
        $positions = LotPosition::whereNull('released_at')
            ->whereHas('staging', fn($q) => $q->where('box_group_id', $groupId))
            ->get(['rack_slot_id', 'lot_staging_id']);

        if ($positions->isEmpty()) {
            throw ValidationException::withMessages([
                'box_group_id' => 'Those boxes are no longer in the rack. Stock this lot normally.',
            ]);
        }

        $facts = LotStaging::whereIn('id', $positions->pluck('lot_staging_id'))
            ->orderByDesc('box_count') // a staging with unknown box facts sorts last
            ->first(['dimension_id', 'box_count']);

        return [
            'id'           => $groupId,
            'slot_ids'     => $positions->pluck('rack_slot_id')->unique()->values()->all(),
            'dimension_id' => $facts?->dimension_id,
            'box_count'    => $facts?->box_count,
        ];
    }

    // A scan of a lot that was just released together with others (e.g. LOT-B scanned after LOT-A
    // released both) gets a clear message instead of the generic "not found".
    private function releasedTogetherNote(string $lotId, Carbon $now): ?string
    {
        $recent = LotStaging::join('lots', 'lots.id', '=', 'lot_stagings.lot_id')
            ->where('lots.lot_id', $lotId)
            ->whereNotNull('lot_stagings.box_group_id')
            ->where('lot_stagings.released_at', '>=', $now->copy()->subMinutes(10))
            ->orderByDesc('lot_stagings.released_at')
            ->first(['lot_stagings.id', 'lot_stagings.box_group_id']);

        if (!$recent) {
            return null;
        }

        $others = LotStaging::join('lots', 'lots.id', '=', 'lot_stagings.lot_id')
            ->where('lot_stagings.box_group_id', $recent->box_group_id)
            ->where('lot_stagings.id', '!=', $recent->id)
            ->pluck('lots.lot_id')
            ->unique()
            ->values()
            ->all();

        return $others
            ? "{$lotId} was already released together with " . implode(', ', $others) . '.'
            : null;
    }

    public function downloadFilteredExport(array $filters, $rackPageId)

@@@ FILE app/Http/Controllers/LotController.php

@@@ EDIT 7
--- find
'recommendation_id' => 'nullable|integer',
--- replace
'recommendation_id' => 'nullable|integer',
            'box_group_id' => 'nullable|integer', // stock on the same boxes as lots already in the rack

@@@ FILE resources/js/Store/useLotStore.js

@@@ EDIT 8a
--- find
clearSlotPendingLot: () => set({ slotPendingLot: [] }),
--- replace
clearSlotPendingLot: () => set({ slotPendingLot: [] }),

{TAB}setSlotPendingLot: (slotPendingLot) => set({ slotPendingLot }),

@@@ EDIT 8b
--- find
: [...state.slotPendingLot, slot],
--- replace
: [...state.slotPendingLot, slot],
{TAB}{TAB}{TAB}{TAB}// Picking slots by hand leaves the "same boxes as" choice (the group dictates the slots).
{TAB}{TAB}{TAB}{TAB}pendingLotToBeAdded: state.pendingLotToBeAdded?.box_group_id
{TAB}{TAB}{TAB}{TAB}{TAB}? { ...state.pendingLotToBeAdded, box_group_id: null }
{TAB}{TAB}{TAB}{TAB}{TAB}: state.pendingLotToBeAdded,

@@@ FILE resources/js/Hooks/useLotActions.jsx

@@@ EDIT 9a
--- find
const qty = toQty(pendingLotToBeAdded?.qty);
--- replace
const qty = toQty(pendingLotToBeAdded?.qty);
        const boxGroupId = pendingLotToBeAdded?.box_group_id ?? null;

@@@ EDIT 9b
--- find
recommendation_id: rec?.id ?? null,
--- replace
box_group_id: boxGroupId,
                    recommendation_id: boxGroupId ? null : (rec?.id ?? null),

@@@ EDIT 9c
--- find
rec?.id &&
--- replace
!boxGroupId &&
                rec?.id &&

@@@ EDIT 9d
--- find
success: `Released ${lotId}`,
--- replace
success: (res) => {
                    const others = (res?.data?.also_released ?? []).map((l) => l.lot_id);
                    return others.length
                        ? `Released ${lotId} + ${others.join(" + ")}`
                        : `Released ${lotId}`;
                },

@@@ EDIT 9e
--- find
store.incrementTotalReleased();
--- replace
// Lots that shared the boxes were released with it.
            const alsoReleased = result?.data?.also_released ?? [];
            alsoReleased.forEach((l) => store.updateLot(l.id, l));
            for (let i = 0; i <= alsoReleased.length; i++) store.incrementTotalReleased();

@@@ FILE resources/js/Pages/LotsUpstream.jsx

@@@ EDIT 10a
--- find
function ScanPanel({ lotActions, dimensions = [], recommendationsVisible = false })
--- replace
// Lets a lot that sits on boxes already in the rack join their "box group":
// same slots, same box count and size, and it is released together with them.
// Stocking: pick the slot(s) where the boxes are, then tap the chip.
// Editing: only shows a note (slot changes apply to the whole group on the server).
// FUTURE: an "unlink from group" button (give the staging its own box_group_id, unlock box count/size)
// could be added here for wrong taps. Not built on purpose. See LotRepository::update and LotService::release.
function SharedBoxes({ occupancy }) {
    const {
        isEditMode,
        slotPendingLot,
        setSlotPendingLot,
        pendingLotToBeAdded,
        editPendingLot,
        slots,
    } = useLotStore();

    const activeGroupId = pendingLotToBeAdded?.box_group_id ?? null;

    // Stocking: groups already sitting in the slots picked so far.
    const groups = useMemo(() => {
        if (isEditMode) return [];
        const map = new Map();
        for (const s of slotPendingLot) {
            for (const o of occupancy?.[s.id] ?? []) {
                if (!o.box_group_id) continue;
                const g = map.get(o.box_group_id) ?? {
                    id: o.box_group_id,
                    lots: new Set(),
                    slotIds: new Set(),
                    box_count: o.box_count,
                    dimension_id: o.dimension_id,
                };
                g.lots.add(o.id);
                (o.slot_ids ?? []).forEach((id) => g.slotIds.add(id));
                map.set(o.box_group_id, g);
            }
        }
        return [...map.values()];
    }, [isEditMode, slotPendingLot, occupancy]);

    // Editing: the other lots on the same boxes as this one.
    const editGroupId = isEditMode
        ? ((pendingLotToBeAdded?.stagings ?? []).find((s) => !s.released_at)?.box_group_id ?? null)
        : null;

    const mates = useMemo(() => {
        if (!editGroupId) return [];
        const rows = Object.values(occupancy ?? {}).flat();
        return [
            ...new Set(
                rows
                    .filter(
                        (r) =>
                            Number(r.box_group_id) === Number(editGroupId) &&
                            r.id !== pendingLotToBeAdded?.lot_id,
                    )
                    .map((r) => r.id),
            ),
        ];
    }, [editGroupId, occupancy, pendingLotToBeAdded?.lot_id]);

    if (isEditMode) {
        if (mates.length === 0) return null;
        return (
            <div className="py-2 text-[11px] text-warning">
                Shares boxes with <b>{mates.join(", ")}</b>. Changing slots moves all of them.
                Releasing releases all of them.
            </div>
        );
    }

    if (groups.length === 0 && !activeGroupId) return null;

    return (
        <div className="py-2">
            <label className="block text-[10px] font-bold tracking-widest text-base-content uppercase mb-1">
                Same boxes as
            </label>
            <div className="flex flex-wrap gap-1">
                {groups.map((g) => (
                    <button
                        key={g.id}
                        type="button"
                        className={clsx(
                            "btn btn-xs",
                            Number(activeGroupId) === Number(g.id) ? "btn-primary" : "btn-outline",
                        )}
                        onClick={() => {
                            editPendingLot("box_group_id", g.id);
                            editPendingLot("box_count", g.box_count ?? "");
                            editPendingLot("dimension_id", g.dimension_id ?? "");
                            setSlotPendingLot(
                                [...g.slotIds].map((id) => slots[id]).filter(Boolean),
                            );
                        }}
                    >
                        {[...g.lots].join(" + ")}
                    </button>
                ))}
                {activeGroupId && (
                    // Only deselects the chip on this form (stock as new boxes). It does not touch saved lots.
                    <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => editPendingLot("box_group_id", null)}
                    >
                        not shared
                    </button>
                )}
            </div>
        </div>
    );
}

function ScanPanel({ lotActions, dimensions = [], recommendationsVisible = false, occupancy })

@@@ EDIT 10b
--- find
<RecommendationLine enabled={recommendationsVisible && !isEditMode} />
--- replace
<RecommendationLine enabled={recommendationsVisible && !isEditMode && !pendingLotToBeAdded.box_group_id} />

@@@ EDIT 10c
--- find
<SlotAssign />
--- replace
<SharedBoxes occupancy={occupancy} />

            <SlotAssign />

@@@ EDIT 10d
--- find
className="input w-full"
--- replace
disabled={!!pendingLotToBeAdded.box_group_id}
                            className="input w-full"

@@@ EDIT 10e
--- find
className="select w-full"
--- replace
disabled={!!pendingLotToBeAdded.box_group_id}
                            className="select w-full"

@@@ EDIT 10f
--- find
<ScanPanel lotActions={lotActions} dimensions={dimensions} recommendationsVisible={recommendationsVisible} />
--- replace
<ScanPanel lotActions={lotActions} dimensions={dimensions} recommendationsVisible={recommendationsVisible} occupancy={occupancy} />

@@@ EDIT 10g
--- find
const handleWithdrawerClose = () => {
--- replace
// Lots that share boxes with the one being released leave together (the server releases the whole group).
    // FUTURE: "release only this lot" would change this memo and LotService::release.
    const releaseGroupLotIds = useMemo(() => {
        const code = lotToBeReleased?.lot_id;
        if (!code) return [];
        const rows = Object.values(occupancy ?? {}).flat();
        const mine = rows.find((r) => r.id === code && r.box_group_id);
        if (!mine) return [code];
        return [
            ...new Set(
                rows
                    .filter((r) => Number(r.box_group_id) === Number(mine.box_group_id))
                    .map((r) => r.id),
            ),
        ];
    }, [occupancy, lotToBeReleased]);

    const handleWithdrawerClose = () => {

@@@ EDIT 10h
--- find
Releasing{" "}
--- replace
{releaseGroupLotIds.length > 1 && (
                                <div className="text-[11px] opacity-70 mb-1">
                                    These lots share the same boxes, so they are released together.
                                </div>
                            )}
                            Releasing{" "}

@@@ EDIT 10i
--- find
className="badge badge-primary badge-sm"
--- replace
className="badge badge-primary badge-sm h-auto whitespace-normal py-0.5"

@@@ EDIT 10j
--- find
{lotToBeReleased?.lot_id}
--- replace
{releaseGroupLotIds.join(" + ") || lotToBeReleased?.lot_id}

@@@ FILE resources/js/Pages/Rack.jsx

@@@ EDIT 11
--- find
if (isManuallyFull || !isSlotEnabled) return;
--- replace
if (!isSlotEnabled) return;
{TAB}{TAB}{TAB}{TAB}// A full slot can still be picked in the stock dialog, to join the boxes already in it.
{TAB}{TAB}{TAB}{TAB}if (isManuallyFull && !(multiSelect && hasLots)) return;