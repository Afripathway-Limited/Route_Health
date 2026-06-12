<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsAppMessage;
use App\Models\AnomalyAlert;
use App\Models\Rider;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Task;
use App\Services\RoutingEngineService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RouteController extends Controller
{
    public function __construct(private readonly RoutingEngineService $routingEngine)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = Route::forOrganization($orgId)->with(['rider', 'stops.task.facility']);

        if ($request->date) {
            $query->whereDate('date', $request->date);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->rider_id) {
            $query->where('rider_id', $request->rider_id);
        }

        $routes = $query->latest('date')->paginate(30);
        $data = $routes->map(fn($r) => $this->formatRoute($r));

        return $this->paginated($routes->setCollection($data));
    }

    public function show(Request $request, Route $route): JsonResponse
    {
        $this->authorizeOrg($request, $route);
        $route->load(['rider', 'stops' => fn($q) => $q->orderBy('sequence'), 'stops.task.facility', 'stops.custodyPhotos', 'stops.whatsappConfirmation', 'driverLocations' => fn($q) => $q->orderBy('recorded_at')]);

        return $this->success($this->formatRouteDetail($route));
    }

    public function stops(Request $request, Route $route): JsonResponse
    {
        $this->authorizeOrg($request, $route);
        $stops = $route->stops()->with(['task.facility', 'custodyPhotos', 'whatsappConfirmation'])->orderBy('sequence')->get();

        return $this->success($stops->map(fn($s) => $this->formatStop($s)));
    }

    public function optimize(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $request->validate([
            'date' => 'required|date',
            'rider_ids' => 'required|array|min:1',
            'rider_ids.*' => 'integer|exists:riders,id',
            'task_ids' => 'required|array|min:1',
            'task_ids.*' => 'integer|exists:tasks,id',
            'depot_facility_id' => 'required|integer|exists:facilities,id',
        ]);

        // Include both org-specific and platform riders (organization_id = null)
        $riders = Rider::whereIn('id', $request->rider_ids)
            ->where(function ($q) use ($orgId) {
                $q->where('organization_id', $orgId)->orWhereNull('organization_id');
            })
            ->with('homeFacility')
            ->get();

        $tasks = Task::whereIn('id', $request->task_ids)
            ->where('organization_id', $orgId)
            ->with('facility')
            ->get();

        $depot = \App\Models\Facility::where('id', $request->depot_facility_id)
            ->where('organization_id', $orgId)
            ->firstOrFail();

        $result = $this->routingEngine->optimize(
            $tasks,
            $riders,
            ['lat' => (float) $depot->latitude, 'lng' => (float) $depot->longitude],
            $request->date
        );

        return $this->success($result, 'Routes optimized successfully');
    }

    public function dispatch(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $request->validate([
            'date' => 'required|date',
            'depot_facility_id' => 'required|integer|exists:facilities,id',
            'routes' => 'required|array|min:1',
            'routes.*.rider_id' => 'required|integer|exists:riders,id',
            'routes.*.stops' => 'required|array|min:1',
        ]);

        $depot = \App\Models\Facility::findOrFail($request->depot_facility_id);

        DB::beginTransaction();
        try {
            $dispatchedRoutes = [];

            foreach ($request->routes as $routeData) {
                $rider = Rider::where('id', $routeData['rider_id'])
                    ->where(function ($q) use ($orgId) {
                        $q->where('organization_id', $orgId)->orWhereNull('organization_id');
                    })
                    ->firstOrFail();

                $route = Route::create([
                    'organization_id' => $orgId,
                    'rider_id' => $rider->id,
                    'date' => $request->date,
                    'status' => 'assigned',
                    'depot_latitude' => $depot->latitude,
                    'depot_longitude' => $depot->longitude,
                    'planned_start_time' => Carbon::parse($request->date . ' 08:00:00'),
                    'total_stops' => count($routeData['stops']),
                    'optimization_data' => $routeData,
                ]);

                foreach ($routeData['stops'] as $stopData) {
                    $task = Task::where('id', $stopData['task_id'])
                        ->where('organization_id', $orgId)
                        ->firstOrFail();

                    $stop = RouteStop::create([
                        'route_id' => $route->id,
                        'task_id' => $task->id,
                        'sequence' => $stopData['sequence'],
                        'planned_arrival' => $stopData['planned_arrival'],
                        'planned_departure' => $stopData['planned_departure'] ?? null,
                        'status' => 'pending',
                    ]);

                    $task->update(['route_id' => $route->id, 'status' => 'assigned']);
                }

                // Queue WhatsApp dispatch notification
                SendWhatsAppMessage::dispatch(
                    $orgId,
                    $rider->phone,
                    'dispatch',
                    [
                        'rider_name' => $rider->name,
                        'stop_count' => count($routeData['stops']),
                        'date' => Carbon::parse($request->date)->format('l, F j'),
                    ],
                    null,
                    $rider->id
                );

                $dispatchedRoutes[] = $route->id;
            }

            DB::commit();

            return $this->success([
                'dispatched_count' => count($dispatchedRoutes),
                'route_ids' => $dispatchedRoutes,
            ], count($dispatchedRoutes) . ' routes dispatched successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Route dispatch failed: ' . $e->getMessage());
            return $this->error('Failed to dispatch routes: ' . $e->getMessage(), 500);
        }
    }

    public function liveRiders(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $activeRoutes = Route::forOrganization($orgId)
            ->where('status', 'in_progress')
            ->whereDate('date', today())
            ->with([
                'rider',
                'stops' => fn($q) => $q->orderBy('sequence'),
                'stops.task.facility',
            ])
            ->get();

        $data = $activeRoutes->map(function (Route $route) {
            $stops = $route->stops;
            $completedStops = $stops->whereIn('status', ['collected', 'delivered', 'confirmed_delivered', 'failed', 'disputed'])->count();
            $currentStop = $stops->where('status', 'pending')->first()
                ?? $stops->where('status', 'arrived')->first();
            $nextStop = $currentStop ? $stops->where('sequence', '>', ($currentStop->sequence ?? 0))->first() : null;

            $latestLocation = $route->rider->latestLocation;

            return [
                'route_id' => $route->id,
                'rider' => [
                    'id' => $route->rider->id,
                    'name' => $route->rider->name,
                    'phone' => $route->rider->phone,
                    'photo_url' => $route->rider->photo_url,
                    'vehicle_type' => $route->rider->vehicle_type,
                ],
                'status' => $route->status,
                'total_stops' => $stops->count(),
                'completed_stops' => $completedStops,
                'completion_percentage' => $stops->count() > 0
                    ? round(($completedStops / $stops->count()) * 100, 1)
                    : 0,
                'current_stop' => $currentStop ? $this->formatStop($currentStop) : null,
                'next_stop' => $nextStop ? $this->formatStop($nextStop) : null,
                'latest_location' => $latestLocation ? [
                    'latitude' => (float) $latestLocation->latitude,
                    'longitude' => (float) $latestLocation->longitude,
                    'recorded_at' => $latestLocation->recorded_at,
                ] : null,
                'has_disputes' => $stops->where('status', 'disputed')->isNotEmpty(),
                'eta_next_stop' => $nextStop?->planned_arrival,
            ];
        });

        return $this->success($data);
    }

    public function anomalies(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $alerts = AnomalyAlert::forOrganization($orgId)
            ->where('is_dismissed', false)
            ->with(['rider', 'route'])
            ->latest('triggered_at')
            ->get();

        return $this->success($alerts->map(fn($a) => [
            'id' => $a->id,
            'alert_type' => $a->alert_type,
            'description' => $a->description,
            'severity' => $a->severity,
            'rider_name' => $a->rider?->name,
            'route_id' => $a->route_id,
            'triggered_at' => $a->triggered_at,
            'is_dismissed' => $a->is_dismissed,
        ]));
    }

    public function dismissAnomaly(Request $request, AnomalyAlert $anomalyAlert): JsonResponse
    {
        if ($anomalyAlert->organization_id !== $request->user()->organization_id) {
            return $this->error('Access denied', 403);
        }

        $anomalyAlert->update([
            'is_dismissed' => true,
            'resolved_at' => now(),
            'acknowledged_by' => $request->user()->id,
        ]);

        return $this->success(null, 'Alert dismissed');
    }

    private function formatRoute(Route $r): array
    {
        return [
            'id' => $r->id,
            'rider' => $r->rider ? [
                'id' => $r->rider->id,
                'name' => $r->rider->name,
                'photo_url' => $r->rider->photo_url,
                'vehicle_type' => $r->rider->vehicle_type,
            ] : null,
            'date' => $r->date?->format('Y-m-d'),
            'status' => $r->status,
            'total_stops' => $r->total_stops,
            'completed_stops' => $r->completed_stops_count,
            'completion_rate' => $r->completion_rate,
            'total_distance_km' => $r->total_distance_km,
            'planned_start_time' => $r->planned_start_time,
            'actual_start_time' => $r->actual_start_time,
            'actual_end_time' => $r->actual_end_time,
            'created_at' => $r->created_at,
        ];
    }

    private function formatRouteDetail(Route $r): array
    {
        return [
            ...$this->formatRoute($r),
            'depot_latitude' => $r->depot_latitude,
            'depot_longitude' => $r->depot_longitude,
            'stops' => $r->stops->map(fn($s) => $this->formatStop($s)),
            'driver_locations' => $r->driverLocations->map(fn($l) => [
                'latitude' => (float) $l->latitude,
                'longitude' => (float) $l->longitude,
                'recorded_at' => $l->recorded_at,
            ]),
        ];
    }

    private function formatStop(RouteStop $s): array
    {
        $facility = $s->task?->facility;

        return [
            'id' => $s->id,
            'sequence' => $s->sequence,
            'task_id' => $s->task_id,
            'facility' => $facility ? [
                'id' => $facility->id,
                'name' => $facility->name,
                'city' => $facility->city,
                'latitude' => (float) $facility->latitude,
                'longitude' => (float) $facility->longitude,
                'contact_phone' => $facility->contact_phone,
                'special_notes' => $facility->special_notes,
                'facility_type' => $facility->facility_type,
            ] : null,
            'status' => $s->status,
            'planned_arrival' => $s->planned_arrival,
            'actual_arrival' => $s->actual_arrival,
            'delay_minutes' => $s->delay_minutes,
            'fail_reason' => $s->fail_reason,
            'fail_notes' => $s->fail_notes,
            'whatsapp_sent' => $s->whatsapp_sent,
            'pickup_photo' => $s->pickupPhoto ? [
                'url' => $s->pickupPhoto->photo_url,
                'thumbnail_url' => $s->pickupPhoto->thumbnail_url,
                'taken_at' => $s->pickupPhoto->taken_at,
                'latitude' => (float) $s->pickupPhoto->latitude,
                'longitude' => (float) $s->pickupPhoto->longitude,
            ] : null,
            'delivery_photo' => $s->deliveryPhoto ? [
                'url' => $s->deliveryPhoto->photo_url,
                'thumbnail_url' => $s->deliveryPhoto->thumbnail_url,
                'taken_at' => $s->deliveryPhoto->taken_at,
                'latitude' => (float) $s->deliveryPhoto->latitude,
                'longitude' => (float) $s->deliveryPhoto->longitude,
            ] : null,
            'whatsapp_confirmation' => $s->whatsappConfirmation ? [
                'response' => $s->whatsappConfirmation->response,
                'received_at' => $s->whatsappConfirmation->received_at,
            ] : null,
        ];
    }

    private function authorizeOrg(Request $request, Route $route): void
    {
        if ($route->organization_id !== $request->user()->organization_id) {
            abort(403, 'Access denied');
        }
    }
}
