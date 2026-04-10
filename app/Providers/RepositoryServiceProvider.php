<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\Interfaces\ProductionLineRepositoryInterface;
use App\Repositories\Interfaces\RackRepositoryInterface;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;
use App\Repositories\Interfaces\LotRepositoryInterface;
use App\Repositories\Interfaces\LotPositionRepositoryInterface;
use App\Repositories\ProductionLineRepository;
use App\Repositories\RackRepository;
use App\Repositories\RackSlotRepository;
use App\Repositories\LotRepository;
use App\Repositories\LotPositionRepository;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            ProductionLineRepositoryInterface::class,
            ProductionLineRepository::class,
        );

        $this->app->bind(
            RackRepositoryInterface::class,
            RackRepository::class,
        );

        $this->app->bind(
            RackSlotRepositoryInterface::class,
            RackSlotRepository::class,
        );

        $this->app->bind(
            LotRepositoryInterface::class,
            LotRepository::class,
        );

        $this->app->bind(
            LotPositionRepositoryInterface::class,
            LotPositionRepository::class,
        );
    }
}
