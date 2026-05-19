<?php

namespace App\Console\Commands;

use App\Models\EtaHistory;
use App\Models\FacilityEtaAdjustment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ComputeEtaAdjustments extends Command
{
    protected $signature = 'routehealth:compute-eta-adjustments';
    protected $description = 'Compute AI ETA adjustments from historical stop data';

    public function handle(): void
    {
        $this->info('Computing ETA adjustments from historical data...');

        $results = DB::table('eta_history')
            ->whereNotNull('delay_minutes')
            ->selectRaw('facility_id, day_of_week, hour_of_day, AVG(delay_minutes) as avg_delay, COUNT(*) as sample_count')
            ->groupBy('facility_id', 'day_of_week', 'hour_of_day')
            ->get();

        $count = 0;
        foreach ($results as $row) {
            FacilityEtaAdjustment::updateOrCreate(
                [
                    'facility_id' => $row->facility_id,
                    'day_of_week' => $row->day_of_week,
                    'hour_of_day' => $row->hour_of_day,
                ],
                [
                    'avg_delay_minutes' => round($row->avg_delay, 2),
                    'sample_count' => $row->sample_count,
                    'computed_at' => now(),
                ]
            );
            $count++;
        }

        $this->info("Updated {$count} ETA adjustment records.");
    }
}
