<?php

namespace App\Providers;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->callAfterResolving(Schedule::class, function (Schedule $schedule) {
            $schedule->command('routehealth:detect-anomalies')->everyFiveMinutes();
            $schedule->command('routehealth:compute-eta-adjustments')->dailyAt('02:00');
        });
    }
}
