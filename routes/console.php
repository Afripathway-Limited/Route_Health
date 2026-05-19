<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily summary emails at 7 PM Nairobi time
Schedule::job(new \App\Jobs\SendDailySummaryEmail)->dailyAt('19:00')->timezone('Africa/Nairobi');

// Anomaly detection every 5 minutes during business hours
Schedule::command('routehealth:detect-anomalies')->everyFiveMinutes()->between('06:00', '20:00');
