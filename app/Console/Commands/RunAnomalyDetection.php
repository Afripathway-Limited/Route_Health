<?php

namespace App\Console\Commands;

use App\Services\AnomalyDetectionService;
use Illuminate\Console\Command;

class RunAnomalyDetection extends Command
{
    protected $signature = 'routehealth:detect-anomalies';
    protected $description = 'Run anomaly detection checks for all active routes';

    public function handle(AnomalyDetectionService $service): void
    {
        $this->info('Running anomaly detection...');
        $service->runAll();
        $this->info('Anomaly detection complete.');
    }
}
