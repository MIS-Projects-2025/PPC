<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
  // testing the scheduler manually
  // php artisan schedule:run
  // when ready for production, do something like this:
  // * * * * * php /path-to-your-project/artisan schedule:run >> /dev/null 2>&1

  // Run this first in one terminal
  // php artisan schedule:work
  // ^ This command will continuously check every minute and 
  // run tasks automatically. It’s perfect for testing without setting up a real cron.

  /**
   * Register all Artisan commands.
   *
   * This method auto-discovers commands within the `app/Console/Commands` directory.
   * You can also manually register them in the $commands array below if needed.
   */
  protected $commands = [
    \App\Console\Commands\AutoImportWipCommand::class,
  ];

  /**
   * Define the application's command schedule.
   *
   * Here is where you register all scheduled commands and jobs.
   */
  protected function schedule(Schedule $schedule): void
  {
    // Example: run the AutoImportWipCommand every day at 7:00 AM
    // $schedule->command('auto:import-wip')
    //   ->dailyAt('07:00')
    //   ->withoutOverlapping()
    //   ->sendOutputTo(storage_path('logs/auto_import_wip.log'));

    // You can also test it every minute while developing:
    // $schedule
    //   ->command('auto:import-wip')
    //   ->everyMinute()
    //   // ->withoutOverlapping()
    //   ->sendOutputTo(storage_path('logs/auto_import_wip.log'));

    $schedule->command('loading-plan:finalize')->dailyAt('06:00');
  }

  /**
   * Register the commands for the application.
   *
   * This loads routes/console.php, where you can define closure-based Artisan commands.
   */
  protected function commands(): void
  {
    $this->load(__DIR__ . '/Commands');

    require base_path('routes/console.php');
  }
}
