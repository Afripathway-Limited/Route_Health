<?php

namespace App\Services;

use App\Models\EtaHistory;
use App\Models\FacilityEtaAdjustment;
use App\Models\RouteStop;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class EtaPredictionService
{
    private const MIN_SAMPLES = 5;
    private const HISTORY_LIMIT = 30;
    private const HOUR_WINDOW = 2;

    /**
     * Return a planned arrival adjusted by historical delay at this facility+time.
     */
    public function getAdjustedEta(int $facilityId, int $riderId, Carbon $plannedArrival): Carbon
    {
        $dayOfWeek = $plannedArrival->dayOfWeek;
        $hour = $plannedArrival->hour;

        // Try cached pre-computed adjustment first
        $cached = FacilityEtaAdjustment::where('facility_id', $facilityId)
            ->where('day_of_week', $dayOfWeek)
            ->whereBetween('hour_of_day', [max(0, $hour - self::HOUR_WINDOW), min(23, $hour + self::HOUR_WINDOW)])
            ->where('sample_count', '>=', self::MIN_SAMPLES)
            ->avg('avg_delay_minutes');

        if ($cached !== null) {
            return $plannedArrival->copy()->addMinutes((int) round($cached));
        }

        // Fall back to live query
        $records = EtaHistory::where('facility_id', $facilityId)
            ->where('day_of_week', $dayOfWeek)
            ->whereBetween('hour_of_day', [max(0, $hour - self::HOUR_WINDOW), min(23, $hour + self::HOUR_WINDOW)])
            ->whereNotNull('delay_minutes')
            ->latest()
            ->limit(self::HISTORY_LIMIT)
            ->get();

        if ($records->count() < self::MIN_SAMPLES) {
            return $plannedArrival;
        }

        $avgDelay = (int) round($records->avg('delay_minutes'));
        return $plannedArrival->copy()->addMinutes($avgDelay);
    }

    /**
     * Return the average delay in minutes for a facility across all history.
     */
    public function getFacilityDelayAverage(int $facilityId): float
    {
        return Cache::remember("facility_delay_{$facilityId}", 3600, function () use ($facilityId) {
            return (float) round(
                EtaHistory::where('facility_id', $facilityId)
                    ->whereNotNull('delay_minutes')
                    ->avg('delay_minutes') ?? 0,
                1
            );
        });
    }

    /**
     * Return a 0–100 performance score for a rider based on recent on-time rate.
     */
    public function getRiderPerformanceScore(int $riderId): float
    {
        $records = EtaHistory::where('rider_id', $riderId)
            ->whereNotNull('delay_minutes')
            ->latest()
            ->limit(self::HISTORY_LIMIT)
            ->get();

        if ($records->isEmpty()) {
            return 100.0;
        }

        $onTime = $records->filter(fn($r) => $r->delay_minutes <= 5)->count();
        return round(($onTime / $records->count()) * 100, 1);
    }

    /**
     * Apply AI ETA adjustments to a list of planned stops.
     * Returns stops with adjusted ETAs and an is_ai_adjusted flag.
     */
    public function applyToStops(array $stops, int $riderId): array
    {
        return array_map(function (array $stop) use ($riderId) {
            $facilityId = $stop['facility_id'] ?? null;
            $plannedArrival = isset($stop['planned_arrival'])
                ? Carbon::parse($stop['planned_arrival'])
                : null;

            if (!$facilityId || !$plannedArrival) {
                return array_merge($stop, ['is_ai_adjusted' => false]);
            }

            $adjusted = $this->getAdjustedEta($facilityId, $riderId, $plannedArrival);
            $isAdjusted = !$adjusted->eq($plannedArrival);

            return array_merge($stop, [
                'planned_arrival' => $adjusted->toISOString(),
                'original_planned_arrival' => $plannedArrival->toISOString(),
                'is_ai_adjusted' => $isAdjusted,
                'ai_delay_minutes' => $isAdjusted ? $adjusted->diffInMinutes($plannedArrival, false) : 0,
            ]);
        }, $stops);
    }
}
