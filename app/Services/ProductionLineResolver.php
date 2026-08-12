<?php

namespace App\Services;

use App\Constants\WipConstants;
use Illuminate\Support\Facades\DB;

class ProductionLineResolver
{
  /** @var array<string, array> Rules keyed by package, each an array of rule rows sorted by priority */
  private array $rulesByPackage = [];

  /** @var array<string, string> Flat package => production_line map (fast path) */
  private array $flatMap = [];

  /** @var array<string, ?string> Fallback default_pl from ppc_package_master, keyed by package */
  private array $defaultPlMap = [];

  private bool $loaded = false;

  public static function factoryFromFocusGroup(?string $focusGroup): ?string
  {
    if (!$focusGroup) return null;

    if (in_array($focusGroup, WipConstants::F2_OUT_FOCUS_GROUP_INCLUSION)) return 'F2';
    if (!in_array($focusGroup, WipConstants::FOCUS_GROUP_F1_EXCLUSION)) return 'F1';

    return null;
  }

  /**
   * Load all reference data once per import run. Call this before processing any rows.
   */
  public function preload(): void
  {
    // 1. Fast-path flat lookup table
    $this->flatMap = DB::table('ppc_package_master')
      ->where('is_telford', 1)
      ->where('is_active', 1)
      ->pluck('default_pl', 'package')
      ->toArray();

    // 2. Exception rules — only packages with conditional logic land here
    $rules = DB::table('ppc_package_pl_rules')
      ->where('is_active', 1)
      ->whereRaw('(valid_from IS NULL OR valid_from <= CURDATE())')
      ->whereRaw('(valid_to IS NULL OR valid_to >= CURDATE())')
      ->orderBy('priority')
      ->get();

    $this->rulesByPackage = [];
    foreach ($rules as $rule) {
      $this->rulesByPackage[$rule->package][] = $rule;
    }

    // 3. Master fallback defaults
    $this->defaultPlMap = DB::table('ppc_package_master')
      ->where('is_telford', 1)
      ->where('is_active', 1)
      ->pluck('default_pl', 'package')
      ->toArray();

    $this->loaded = true;
  }

  public function resolve(string $package, ?string $factory, ?int $leadCount, ?string $partName): ?string
  {
    if (!$this->loaded) {
      $this->preload();
    }

    // Only packages with actual exception rules go through conditional matching
    if (isset($this->rulesByPackage[$package])) {
      foreach ($this->rulesByPackage[$package] as $rule) {
        if ($rule->factory !== null && $rule->factory !== $factory) continue;
        if ($rule->lead_count !== null && (int) $rule->lead_count !== $leadCount) continue;
        if ($rule->partname_like !== null && !$this->matchesLikePattern($partName, $rule->partname_like)) continue;

        return $rule->production_line;
      }
      // Rules existed for this package but none matched this row — fall through
    }

    // Fast path: flat reference table
    if (isset($this->flatMap[$package])) {
      return $this->flatMap[$package];
    }

    // Final fallback: package master default
    return $this->defaultPlMap[$package] ?? null;
  }

  /**
   * Replicates SQL 'LIKE' pattern matching in PHP.
   * Supports % (any sequence) and _ (single char) wildcards.
   */
  private function matchesLikePattern(?string $value, string $pattern): bool
  {
    if ($value === null) return false;

    $regex = preg_quote($pattern, '/');
    $regex = str_replace(['%', '_'], ['.*', '.'], $regex);

    return (bool) preg_match('/^' . $regex . '$/i', $value);
  }
}
