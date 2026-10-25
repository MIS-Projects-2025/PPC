<?php

namespace App\Services;

final class RecipeInfo
{
    public const PACKAGE_LIST     = 'package_list';
    public const PROCESS_TRAVELER = 'process_traveler';

    public function __construct(
        public readonly ?int $recipe,          // null = no recipe
        public readonly ?string $allocation,   // package_list.allocation, or traveler.input_type (TUBE/TRAY 95% rule)
        public readonly string $sourceType,    // PACKAGE_LIST | PROCESS_TRAVELER
        public readonly ?int $sourceId,        // package_list.id | process_travelers.id
    ) {}

    /** "Looked, found nothing". Keeps F3 lots from falling back to a package_list lookup by part name. */
    public static function none(string $sourceType = self::PACKAGE_LIST): self
    {
        return new self(null, null, $sourceType, null);
    }
}
