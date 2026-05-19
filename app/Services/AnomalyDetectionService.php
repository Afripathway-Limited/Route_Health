<?php

namespace App\Services;

use App\Events\AnomalyDetected;
use App\Models\AnomalyAlert;
use App\Models\DriverLocation;
use App\Models\Organization;
use App\Models\PlatformSetting;
use App\Models\Route;
use App\Models\RouteStop;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AnomalyDetectionService
{
    private int $stationaryMinutes;
    private int $overdueMinutes;
    private int $offlineMinutes;
    private int $deviationMeters;

    public function __construct()
    {
        $this->stationaryMinutes = (int) PlatformSetting::get('anomaly_stationary_minutes', 20);
        $this->overdueMinutes = (int) PlatformSetting::get('anomaly_overdue_minutes', 30);
        $this->offlineMinutes = (int) PlatformSetting::get('anomaly_offline_minutes', 15);
        $this->deviationMeters = (int) PlatformSetting::get('anomaly_deviation_meters', 800);
    }

    public function runAll(): void
    {
        $startHour = (int) PlatformSetting::get('anomaly_detection_start_hour', 6);
        $endHour = (int) PlatformSetting::get('anomaly_detection_end_hour', 20);
        $currentHour = now()->hour;

        if ($currentHour < $startHour || $currentHour > $endHour) {
            return;
        }

        $activeRoutes = Route::whereDate('date', today())
            ->whereIn('status', ['assigned', 'in_progress'])
            ->with(['rider', 'stops.task.facility', 'organization'])
            ->get();

        foreach ($activeRoutes as $route) {
            $this->checkStationaryRider($route);
            $this->checkOverdueStops($route);
            $this->checkRiderOffline($route);
            $this->checkRouteDeviation($route);
        }
    }

    private function checkStationaryRider(Route $route): void
    {
        $cutoff = now()->subMinutes($this->stationaryMinutes);

        $locations = DriverLocation::where('rider_id', $route->rider_id)
            ->where('route_id', $route->id)
            ->where('recorded_at', '>=', $cutoff)
            ->orderBy('recorded_at')
            ->get();

        if ($locations->count() < 2) return;

        $first = $locations->first();
        $last = $locations->last();

        $distanceM = $this->haversineMeters(
            (float) $first->latitude, (float) $first->longitude,
            (float) $last->latitude, (float) $last->longitude
        );

        if ($distanceM < 50) {
            $currentStop = $route->stops->where('status', 'pending')->first();
            if ($currentStop) {
                $this->createAlertIfNew($route, 'stationary_too_long',
                    "Rider {$route->rider->name} has been stationary for {$this->stationaryMinutes}+ minutes without marking arrival.",
                    'warning',
                    $currentStop->id
                );
            }
        }
    }

    private function checkOverdueStops(Route $route): void
    {
        $overdueStops = $route->stops->filter(fn($s) => $s->isOverdue());

        foreach ($overdueStops as $stop) {
            $minutesLate = (int) now()->diffInMinutes($stop->planned_arrival);
            $facilityName = $stop->task?->facility?->name ?? 'Unknown Facility';

            $this->createAlertIfNew($route, 'overdue_stop',
                "Stop at {$facilityName} is {$minutesLate} minutes overdue. Rider {$route->rider->name} has not marked arrival.",
                $minutesLate > 60 ? 'critical' : 'warning',
                $stop->id
            );
        }
    }

    private function checkRiderOffline(Route $route): void
    {
        $cutoff = now()->subMinutes($this->offlineMinutes);

        $hasRecentLocation = DriverLocation::where('rider_id', $route->rider_id)
            ->where('route_id', $route->id)
            ->where('recorded_at', '>=', $cutoff)
            ->exists();

        if (!$hasRecentLocation) {
            $this->createAlertIfNew($route, 'rider_offline',
                "Rider {$route->rider->name} has not sent a GPS location in {$this->offlineMinutes}+ minutes.",
                'critical'
            );
        }
    }

    private function checkRouteDeviation(Route $route): void
    {
        $lastLocation = DriverLocation::where('rider_id', $route->rider_id)
            ->where('route_id', $route->id)
            ->latest('recorded_at')
            ->first();

        if (!$lastLocation) return;

        $lastCompletedStop = $route->stops
            ->whereIn('status', ['collected', 'delivered', 'confirmed_delivered'])
            ->sortByDesc('sequence')
            ->first();

        $currentPendingStop = $route->stops->where('status', 'pending')->first();

        if (!$lastCompletedStop || !$currentPendingStop) return;

        // Check if rider is significantly off the straight-line path
        $fromLat = (float) ($lastCompletedStop->task?->facility?->latitude ?? $route->depot_latitude);
        $fromLng = (float) ($lastCompletedStop->task?->facility?->longitude ?? $route->depot_longitude);
        $toLat = (float) $currentPendingStop->task?->facility?->latitude;
        $toLng = (float) $currentPendingStop->task?->facility?->longitude;
        $riderLat = (float) $lastLocation->latitude;
        $riderLng = (float) $lastLocation->longitude;

        $deviationM = $this->pointToLineDistance($riderLat, $riderLng, $fromLat, $fromLng, $toLat, $toLng);

        if ($deviationM > $this->deviationMeters) {
            $deviationKm = round($deviationM / 1000, 1);
            $this->createAlertIfNew($route, 'route_deviation',
                "Rider {$route->rider->name} is {$deviationKm}km off the planned route path.",
                'warning'
            );
        }
    }

    private function createAlertIfNew(Route $route, string $type, string $description, string $severity, ?int $stopId = null): void
    {
        $exists = AnomalyAlert::where('organization_id', $route->organization_id)
            ->where('route_id', $route->id)
            ->where('alert_type', $type)
            ->where('is_dismissed', false)
            ->where('triggered_at', '>=', now()->subHour())
            ->exists();

        if ($exists) return;

        $alert = AnomalyAlert::create([
            'organization_id' => $route->organization_id,
            'route_id' => $route->id,
            'rider_id' => $route->rider_id,
            'route_stop_id' => $stopId,
            'alert_type' => $type,
            'description' => $description,
            'severity' => $severity,
            'triggered_at' => now(),
        ]);

        try {
            event(new AnomalyDetected($alert->load('rider')));
        } catch (\Exception $e) {
            Log::error('Failed to broadcast anomaly: ' . $e->getMessage());
        }
    }

    private function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat/2)**2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng/2)**2;
        return $R * 2 * atan2(sqrt($a), sqrt(1-$a));
    }

    private function pointToLineDistance(
        float $px, float $py,
        float $ax, float $ay,
        float $bx, float $by
    ): float {
        // Approximate using Euclidean for small distances
        $dx = $bx - $ax;
        $dy = $by - $ay;
        $lenSq = $dx*$dx + $dy*$dy;

        if ($lenSq == 0) {
            return $this->haversineMeters($px, $py, $ax, $ay);
        }

        $t = max(0, min(1, (($px - $ax) * $dx + ($py - $ay) * $dy) / $lenSq));
        $closestX = $ax + $t * $dx;
        $closestY = $ay + $t * $dy;

        return $this->haversineMeters($px, $py, $closestX, $closestY);
    }
}
