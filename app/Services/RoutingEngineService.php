<?php

namespace App\Services;

use App\Models\Facility;
use App\Models\FacilityEtaAdjustment;
use App\Models\PlatformApiConfig;
use App\Models\PlatformSetting;
use App\Models\Rider;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RoutingEngineService
{
    private float $avgSpeedKmh;
    private int $stopDurationMinutes = 10;
    private ?string $osrmUrl;
    private ?string $googleMapsKey;
    private array $distanceCache = [];

    public function __construct()
    {
        $this->avgSpeedKmh = (float) PlatformSetting::get('routing_avg_speed_kmh', 25);
        $this->osrmUrl = PlatformSetting::get('routing_engine_url') ?: null;

        $gMaps = PlatformApiConfig::where('service', 'google_maps')->where('is_enabled', true)->first();
        $this->googleMapsKey = $gMaps ? ($gMaps->config['api_key'] ?? null) : null;
    }

    /**
     * Optimize routes for a set of tasks and riders.
     *
     * @param  Collection<Task>  $tasks
     * @param  Collection<Rider> $riders
     * @param  array  $depot  ['lat' => float, 'lng' => float]
     * @param  string $date
     * @return array
     */
    public function optimize(Collection $tasks, Collection $riders, array $depot, string $date): array
    {
        $startTime = microtime(true);

        // Sort: urgent tasks first, then by time window start
        $sortedTasks = $tasks->sortBy([
            fn($a, $b) => $a->priority === 'urgent' ? -1 : 1,
            fn($a, $b) => strcmp($a->time_window_start, $b->time_window_start),
        ])->values();

        $activeRiders = $riders->where('is_active', true)->values();
        if ($activeRiders->isEmpty()) {
            return ['error' => 'No active riders selected'];
        }

        // Cluster tasks to riders using nearest-neighbor greedy approach
        $assignments = $this->clusterTasksToRiders($sortedTasks, $activeRiders, $depot);

        // Build ordered stop lists with ETAs per rider
        $results = [];
        foreach ($activeRiders as $rider) {
            $riderTasks = $assignments[$rider->id] ?? [];
            if (empty($riderTasks)) continue;

            $orderedStops = $this->orderStopsWithTimeWindows($riderTasks, $depot, $date, $rider);
            $results[] = [
                'rider_id' => $rider->id,
                'rider_name' => $rider->name,
                'rider_photo' => $rider->photo_url,
                'vehicle_type' => $rider->vehicle_type,
                'stops' => $orderedStops['stops'],
                'total_distance_km' => $orderedStops['total_distance_km'],
                'estimated_duration_minutes' => $orderedStops['total_duration_minutes'],
            ];
        }

        $elapsed = round((microtime(true) - $startTime) * 1000);
        Log::info("Route optimization completed in {$elapsed}ms", ['riders' => count($results), 'tasks' => $tasks->count()]);

        return [
            'riders' => $results,
            'optimization_time_ms' => $elapsed,
            'tasks_assigned' => collect($assignments)->sum(fn($t) => count($t)),
            'tasks_unassigned' => $tasks->count() - collect($assignments)->sum(fn($t) => count($t)),
        ];
    }

    private function clusterTasksToRiders(Collection $tasks, Collection $riders, array $depot): array
    {
        $assignments = [];
        foreach ($riders as $rider) {
            $assignments[$rider->id] = [];
        }

        $riderLoad = array_fill_keys($riders->pluck('id')->toArray(), 0);
        $maxPerRider = (int) ceil($tasks->count() / max(1, $riders->count()));

        foreach ($tasks as $task) {
            // Support tasks with direct coordinates (no facility_id)
            $taskLat = $task->facility ? (float) $task->facility->latitude : (float) $task->pickup_lat;
            $taskLng = $task->facility ? (float) $task->facility->longitude : (float) $task->pickup_lng;
            if (!$taskLat || !$taskLng) continue;

            // Find the rider with lowest load and closest home base or last assigned stop
            $bestRider = null;
            $bestScore = PHP_FLOAT_MAX;

            foreach ($riders as $rider) {
                if ($riderLoad[$rider->id] >= $maxPerRider + 2) continue;

                // Use home facility location or depot as starting point
                $riderLat = $rider->homeFacility
                    ? (float) $rider->homeFacility->latitude
                    : $depot['lat'];
                $riderLng = $rider->homeFacility
                    ? (float) $rider->homeFacility->longitude
                    : $depot['lng'];

                // If rider has assignments, use last stop location
                if (!empty($assignments[$rider->id])) {
                    $lastTask = end($assignments[$rider->id]);
                    $riderLat = $lastTask->facility
                        ? (float) $lastTask->facility->latitude
                        : (float) $lastTask->pickup_lat;
                    $riderLng = $lastTask->facility
                        ? (float) $lastTask->facility->longitude
                        : (float) $lastTask->pickup_lng;
                }

                $dist = $this->haversineDistance($riderLat, $riderLng, $taskLat, $taskLng);
                $loadPenalty = $riderLoad[$rider->id] * 2;
                $score = $dist + $loadPenalty;

                if ($score < $bestScore) {
                    $bestScore = $score;
                    $bestRider = $rider;
                }
            }

            if ($bestRider) {
                $assignments[$bestRider->id][] = $task;
                $riderLoad[$bestRider->id]++;
            }
        }

        return $assignments;
    }

    private function orderStopsWithTimeWindows(array $tasks, array $depot, string $date, Rider $rider): array
    {
        // Sort by time window start, with urgent first
        usort($tasks, function ($a, $b) {
            if ($a->priority === 'urgent' && $b->priority !== 'urgent') return -1;
            if ($b->priority === 'urgent' && $a->priority !== 'urgent') return 1;
            return strcmp($a->time_window_start, $b->time_window_start);
        });

        $stops = [];
        $totalDistKm = 0;
        $currentTime = Carbon::parse("{$date} 08:00:00");
        $currentLat = $depot['lat'];
        $currentLng = $depot['lng'];
        $sequence = 1;

        foreach ($tasks as $task) {
            $facilityLat = $task->facility ? (float) $task->facility->latitude : (float) $task->pickup_lat;
            $facilityLng = $task->facility ? (float) $task->facility->longitude : (float) $task->pickup_lng;
            if (!$facilityLat || !$facilityLng) continue;

            $road = $this->getRoadDistance($currentLat, $currentLng, $facilityLat, $facilityLng);
            $distKm = $road['km'];
            $travelMinutes = $road['minutes'];

            $arrivalTime = $currentTime->copy()->addMinutes($travelMinutes);

            // Apply AI ETA adjustment (only for facility-linked tasks)
            $adjustment = $task->facility_id ? $this->getEtaAdjustment($task->facility_id, $arrivalTime) : 0;
            $aiAdjustedArrival = $arrivalTime->copy()->addMinutes($adjustment);

            // If we arrive before the time window, wait
            $windowStart = Carbon::parse("{$date} {$task->time_window_start}");
            if ($aiAdjustedArrival->lt($windowStart)) {
                $aiAdjustedArrival = $windowStart->copy();
            }

            $facilityName = $task->facility ? $task->facility->name : ($task->pickup_name ?? 'Location');
            $facilityCity = $task->facility ? $task->facility->city : '';

            $stops[] = [
                'sequence' => $sequence++,
                'task_id' => $task->id,
                'facility_id' => $task->facility_id,
                'facility_name' => $facilityName,
                'facility_city' => $facilityCity,
                'facility_type' => $task->facility?->facility_type ?? 'clinic',
                'latitude' => $facilityLat,
                'longitude' => $facilityLng,
                'planned_arrival' => $aiAdjustedArrival->toIso8601String(),
                'planned_departure' => $aiAdjustedArrival->copy()->addMinutes($this->stopDurationMinutes)->toIso8601String(),
                'time_window_start' => $task->time_window_start,
                'time_window_end' => $task->time_window_end,
                'priority' => $task->priority,
                'type' => $task->type,
                'distance_from_prev_km' => round($distKm, 2),
                'travel_minutes' => round($travelMinutes, 1),
                'eta_ai_adjusted' => $adjustment != 0,
                'eta_adjustment_minutes' => $adjustment,
                'notes' => $task->facility?->special_notes,
            ];

            $totalDistKm += $distKm;
            $currentTime = $aiAdjustedArrival->copy()->addMinutes($this->stopDurationMinutes);
            $currentLat = $facilityLat;
            $currentLng = $facilityLng;
        }

        // Return distance to depot
        $returnDist = $this->getRoadDistance($currentLat, $currentLng, $depot['lat'], $depot['lng'])['km'];
        $totalDistKm += $returnDist;

        return [
            'stops' => $stops,
            'total_distance_km' => round($totalDistKm, 2),
            'total_duration_minutes' => $currentTime->diffInMinutes(Carbon::parse("{$date} 08:00:00")),
        ];
    }

    /**
     * Returns road distance in km and duration in minutes between two points.
     * Uses Google Distance Matrix API when a key is configured; falls back to Haversine.
     * Results are cached by coordinate key to avoid duplicate API calls.
     */
    private function getRoadDistance(float $lat1, float $lng1, float $lat2, float $lng2): array
    {
        $haversineKm = $this->haversineDistance($lat1, $lng1, $lat2, $lng2);
        $haversineMin = ($haversineKm / $this->avgSpeedKmh) * 60;

        if (!$this->googleMapsKey) {
            return ['km' => $haversineKm, 'minutes' => $haversineMin];
        }

        $cacheKey = "{$lat1},{$lng1}|{$lat2},{$lng2}";
        if (isset($this->distanceCache[$cacheKey])) {
            return $this->distanceCache[$cacheKey];
        }

        try {
            $res = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/distancematrix/json', [
                'origins'      => "{$lat1},{$lng1}",
                'destinations' => "{$lat2},{$lng2}",
                'key'          => $this->googleMapsKey,
                'units'        => 'metric',
            ]);

            $element = $res->json('rows.0.elements.0');
            if (($element['status'] ?? '') === 'OK') {
                $result = [
                    'km'      => round($element['distance']['value'] / 1000, 3),
                    'minutes' => round($element['duration']['value'] / 60, 1),
                ];
                $this->distanceCache[$cacheKey] = $result;
                return $result;
            }
        } catch (\Exception $e) {
            Log::warning('Google Distance Matrix failed, using Haversine fallback', ['error' => $e->getMessage()]);
        }

        return ['km' => $haversineKm, 'minutes' => $haversineMin];
    }

    private function getEtaAdjustment(int $facilityId, Carbon $arrivalTime): int
    {
        $adjustment = FacilityEtaAdjustment::where('facility_id', $facilityId)
            ->where('day_of_week', $arrivalTime->dayOfWeek)
            ->where('hour_of_day', $arrivalTime->hour)
            ->value('avg_delay_minutes');

        return $adjustment ? (int) round($adjustment) : 0;
    }

    private function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadiusKm * $c;
    }
}
