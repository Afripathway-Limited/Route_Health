<?php

namespace App\Http\Controllers\Api;

use App\Events\StopStatusUpdated;
use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsAppMessage;
use App\Models\CustodyPhoto;
use App\Models\DriverLocation;
use App\Models\EtaHistory;
use App\Models\Route;
use App\Models\RouteStop;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class DriverAppController extends Controller
{
    public function todayRoutes(Request $request): JsonResponse
    {
        $rider = $request->user()->rider;
        if (!$rider) {
            return $this->error('Rider profile not found for this user', 404);
        }

        $routes = Route::where('rider_id', $rider->id)
            ->whereDate('date', today())
            ->whereIn('status', ['assigned', 'in_progress'])
            ->with([
                'stops' => fn($q) => $q->orderBy('sequence')->with([
                    'task.facility',
                    'custodyPhotos',
                ]),
            ])
            ->get();

        if ($routes->isEmpty()) {
            return $this->success([], 'No route assigned for today');
        }

        return $this->success($routes->map(fn($r) => $this->formatRoute($r)));
    }

    public function startRoute(Request $request, Route $route): JsonResponse
    {
        $this->authorizeRider($request, $route);

        $route->update([
            'status' => 'in_progress',
            'actual_start_time' => now(),
        ]);

        $this->broadcastEvent('RouteStarted', $route->organization_id, [
            'route_id' => $route->id,
            'rider_id' => $route->rider_id,
        ]);

        return $this->success($this->formatRoute($route->fresh('stops')));
    }

    public function completeRoute(Request $request, Route $route): JsonResponse
    {
        $this->authorizeRider($request, $route);

        $pendingStops = $route->stops()->whereIn('status', ['pending', 'arrived'])->get();
        foreach ($pendingStops as $stop) {
            $stop->update([
                'status' => 'failed',
                'fail_reason' => 'route_ended',
                'fail_notes' => 'Route was ended by rider before this stop was completed.',
            ]);
        }

        $route->update([
            'status' => 'completed',
            'actual_end_time' => now(),
        ]);

        $totalStops = $route->stops()->count();
        $completedCount = $route->stops()->whereIn('status', ['collected', 'delivered', 'confirmed_delivered'])->count();
        $failedCount = $route->stops()->where('status', 'failed')->count();

        $duration = $route->actual_start_time
            ? (int) $route->actual_start_time->diffInMinutes(now())
            : null;

        $this->broadcastEvent('RouteCompleted', $route->organization_id, [
            'route_id' => $route->id,
            'rider_id' => $route->rider_id,
            'rider_name' => $route->rider?->name,
            'total_stops' => $totalStops,
            'completed_count' => $completedCount,
            'failed_count' => $failedCount,
            'duration_minutes' => $duration,
        ]);

        return $this->success([
            'total_stops' => $totalStops,
            'completed_count' => $completedCount,
            'failed_count' => $failedCount,
            'duration_minutes' => $duration,
        ]);
    }

    public function arriveAtStop(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorizeStop($request, $stop);

        if ($stop->route->status !== 'in_progress') {
            return $this->error('Route must be in progress to mark arrival', 422);
        }
        if ($stop->status !== 'pending') {
            return $this->error('Stop is not in pending status', 422);
        }

        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $stop->update([
            'status' => 'arrived',
            'actual_arrival' => now(),
        ]);

        DriverLocation::create([
            'rider_id' => $stop->route->rider_id,
            'route_id' => $stop->route_id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'accuracy' => $request->accuracy,
            'recorded_at' => now(),
        ]);

        $this->fireStopUpdated($stop);

        return $this->success($this->formatStop($stop->fresh('task.facility', 'custodyPhotos')));
    }

    public function uploadPhoto(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorizeStop($request, $stop);

        if (!in_array($stop->status, ['arrived', 'collected'])) {
            return $this->error('Stop must be in arrived or collected status to upload photo', 422);
        }

        $request->validate([
            'photo' => 'required|image|max:5120',
            'photo_type' => 'required|in:pickup,delivery',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'taken_at' => 'required|date',
            'device_id' => 'nullable|string|max:255',
        ]);

        $file = $request->file('photo');
        $orgId = $stop->route->organization_id;
        $date = $stop->route->date->format('Y-m-d');
        $timestamp = now()->format('YmdHis');
        $filename = "{$stop->id}_{$request->photo_type}_{$timestamp}.jpg";
        $path = "organizations/{$orgId}/routes/{$date}/{$stop->route_id}/{$filename}";

        try {
            $manager = new ImageManager(new Driver());
            $image = $manager->read($file->getRealPath());
            $image->scaleDown(1200, 1200);
            $compressed = $image->toJpeg(80)->toString();

            if (config('filesystems.default') === 's3' && config('filesystems.disks.s3.bucket')) {
                Storage::disk('s3')->put($path, $compressed, 'public');
                $photoUrl = Storage::disk('s3')->url($path);
            } else {
                $localPath = 'photos/' . $filename;
                Storage::disk('public')->put($localPath, $compressed);
                $photoUrl = Storage::disk('public')->url($localPath);
            }
        } catch (\Exception $e) {
            Log::error('Photo upload failed: ' . $e->getMessage());
            return $this->error('Photo upload failed: ' . $e->getMessage(), 500);
        }

        $custodyPhoto = CustodyPhoto::create([
            'route_stop_id' => $stop->id,
            'organization_id' => $orgId,
            'photo_type' => $request->photo_type,
            'photo_url' => $photoUrl,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'taken_at' => Carbon::parse($request->taken_at),
            'uploaded_at' => now(),
            'device_id' => $request->device_id,
            'is_offline_upload' => $request->is_offline ?? false,
        ]);

        return $this->success([
            'id' => $custodyPhoto->id,
            'photo_url' => $photoUrl,
            'photo_type' => $custodyPhoto->photo_type,
        ]);
    }

    public function collectStop(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorizeStop($request, $stop);

        $pickupPhoto = $stop->custodyPhotos()->where('photo_type', 'pickup')->first();
        if (!$pickupPhoto) {
            return $this->error('You must photograph the sample before marking as collected.', 422);
        }

        $stop->update([
            'status' => 'collected',
            'actual_departure' => now(),
        ]);

        $stop->task?->update(['status' => 'in_progress']);

        $nextStop = $stop->route->stops()
            ->where('sequence', '>', $stop->sequence)
            ->where('status', 'pending')
            ->orderBy('sequence')
            ->first();

        $eta = $nextStop?->planned_arrival?->format('g:i A') ?? 'soon';

        $org = $stop->route->organization;
        SendWhatsAppMessage::dispatch(
            $stop->route->organization_id,
            $stop->task?->facility?->contact_phone ?? '',
            'on_way',
            ['eta' => $eta],
            $stop->id,
            $stop->route->rider_id,
        );

        $this->fireStopUpdated($stop);

        return $this->success($this->formatStop($stop->fresh('task.facility', 'custodyPhotos')));
    }

    public function deliverStop(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorizeStop($request, $stop);

        $stop->update([
            'status' => 'delivered',
            'actual_departure' => now(),
        ]);

        $stop->task?->update(['status' => 'completed']);

        // Write ETA history
        if ($stop->actual_arrival && $stop->planned_arrival) {
            $delayMinutes = (int) $stop->actual_arrival->diffInMinutes($stop->planned_arrival, false);
            EtaHistory::create([
                'route_stop_id' => $stop->id,
                'facility_id' => $stop->task?->facility_id,
                'rider_id' => $stop->route->rider_id,
                'planned_arrival' => $stop->planned_arrival,
                'actual_arrival' => $stop->actual_arrival,
                'delay_minutes' => $delayMinutes,
                'day_of_week' => $stop->actual_arrival->dayOfWeek,
                'hour_of_day' => $stop->actual_arrival->hour,
            ]);
        }

        SendWhatsAppMessage::dispatch(
            $stop->route->organization_id,
            $stop->task?->facility?->contact_phone ?? '',
            'delivery_confirmation',
            [],
            $stop->id,
            $stop->route->rider_id,
        );

        $this->fireStopUpdated($stop);

        return $this->success($this->formatStop($stop->fresh('task.facility', 'custodyPhotos')));
    }

    public function failStop(Request $request, RouteStop $stop): JsonResponse
    {
        $this->authorizeStop($request, $stop);

        $request->validate([
            'fail_reason' => 'required|in:facility_closed,wrong_address,no_contact,sample_not_ready,other',
            'fail_notes' => 'nullable|string|max:1000',
        ]);

        $stop->update([
            'status' => 'failed',
            'fail_reason' => $request->fail_reason,
            'fail_notes' => $request->fail_notes,
        ]);

        $stop->task?->update(['status' => 'failed']);

        $org = $stop->route->organization;
        $dispatcherPhone = $org->whatsapp_phone;
        if ($dispatcherPhone) {
            SendWhatsAppMessage::dispatch(
                $stop->route->organization_id,
                $dispatcherPhone,
                'failed_alert',
                ['reason' => $request->fail_reason],
                $stop->id,
                $stop->route->rider_id,
            );
        }

        $this->fireStopUpdated($stop);

        return $this->success($this->formatStop($stop->fresh('task.facility', 'custodyPhotos')));
    }

    public function updateLocation(Request $request): JsonResponse
    {
        $rider = $request->user()->rider;
        if (!$rider) {
            return response()->json(['success' => true, 'data' => null, 'message' => 'OK'], 200);
        }

        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'accuracy' => 'nullable|numeric',
        ]);

        $activeRoute = Route::where('rider_id', $rider->id)
            ->whereDate('date', today())
            ->where('status', 'in_progress')
            ->first();

        DriverLocation::create([
            'rider_id' => $rider->id,
            'route_id' => $activeRoute?->id,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'accuracy' => $request->accuracy,
            'recorded_at' => now(),
        ]);

        if ($activeRoute) {
            $this->broadcastEvent('DriverLocationUpdated', $activeRoute->organization_id, [
                'rider_id' => $rider->id,
                'lat' => (float) $request->latitude,
                'lng' => (float) $request->longitude,
            ]);
        }

        return response()->json(['success' => true, 'data' => null, 'message' => 'OK'], 200);
    }

    public function sync(Request $request): JsonResponse
    {
        $rider = $request->user()->rider;
        if (!$rider) {
            return $this->error('Rider profile not found', 404);
        }

        $events = $request->input('events', []);
        if (!is_array($events)) {
            return $this->error('Events must be an array', 422);
        }

        usort($events, fn($a, $b) => strcmp($a['occurred_at'] ?? '', $b['occurred_at'] ?? ''));

        $processed = 0;
        $skipped = 0;
        $errors = [];

        foreach ($events as $event) {
            $deviceEventId = $event['device_event_id'] ?? null;

            if ($deviceEventId) {
                $alreadyProcessed = DB::table('sync_events')
                    ->where('device_event_id', $deviceEventId)
                    ->where('rider_id', $rider->id)
                    ->exists();

                if ($alreadyProcessed) {
                    $skipped++;
                    continue;
                }
            }

            try {
                $this->processSyncEvent($event, $rider, $request);

                if ($deviceEventId) {
                    DB::table('sync_events')->insertOrIgnore([
                        'device_event_id' => $deviceEventId,
                        'rider_id' => $rider->id,
                        'event_type' => $event['type'] ?? 'unknown',
                        'processed_at' => now(),
                    ]);
                }

                $processed++;
            } catch (\Exception $e) {
                $errors[] = ['device_event_id' => $deviceEventId, 'error' => $e->getMessage()];
                Log::warning('Sync event failed', ['event' => $event, 'error' => $e->getMessage()]);
            }
        }

        return $this->success([
            'processed' => $processed,
            'skipped' => $skipped,
            'errors' => $errors,
            'total' => count($events),
        ]);
    }

    private function processSyncEvent(array $event, $rider, Request $request): void
    {
        $type = $event['type'] ?? '';
        $stopId = $event['stop_id'] ?? null;
        $data = $event['data'] ?? [];

        if (!$stopId) return;

        $stop = RouteStop::find($stopId);
        if (!$stop) return;

        // Verify the stop belongs to this rider
        if ($stop->route->rider_id !== $rider->id) return;

        match ($type) {
            'arrive' => $this->processArriveEvent($stop, $data),
            'collect' => $this->processCollectEvent($stop, $data),
            'deliver' => $this->processDeliverEvent($stop),
            'fail' => $this->processFailEvent($stop, $data),
            'location_update' => $this->processLocationEvent($rider, $stop, $data),
            default => null,
        };
    }

    private function processArriveEvent(RouteStop $stop, array $data): void
    {
        if ($stop->status !== 'pending') return;
        $stop->update([
            'status' => 'arrived',
            'actual_arrival' => isset($data['occurred_at']) ? Carbon::parse($data['occurred_at']) : now(),
        ]);
        $this->fireStopUpdated($stop);
    }

    private function processCollectEvent(RouteStop $stop, array $data): void
    {
        if (!in_array($stop->status, ['arrived'])) return;
        $stop->update(['status' => 'collected', 'actual_departure' => now()]);
        $stop->task?->update(['status' => 'in_progress']);
        $this->fireStopUpdated($stop);
    }

    private function processDeliverEvent(RouteStop $stop): void
    {
        if (!in_array($stop->status, ['collected'])) return;
        $stop->update(['status' => 'delivered', 'actual_departure' => now()]);
        $stop->task?->update(['status' => 'completed']);
        $this->fireStopUpdated($stop);
    }

    private function processFailEvent(RouteStop $stop, array $data): void
    {
        $stop->update([
            'status' => 'failed',
            'fail_reason' => $data['fail_reason'] ?? 'other',
            'fail_notes' => $data['fail_notes'] ?? null,
        ]);
        $stop->task?->update(['status' => 'failed']);
        $this->fireStopUpdated($stop);
    }

    private function processLocationEvent($rider, RouteStop $stop, array $data): void
    {
        if (empty($data['latitude']) || empty($data['longitude'])) return;
        DriverLocation::create([
            'rider_id' => $rider->id,
            'route_id' => $stop->route_id,
            'latitude' => $data['latitude'],
            'longitude' => $data['longitude'],
            'accuracy' => $data['accuracy'] ?? null,
            'recorded_at' => isset($data['occurred_at']) ? Carbon::parse($data['occurred_at']) : now(),
        ]);
    }

    private function authorizeRider(Request $request, Route $route): void
    {
        $rider = $request->user()->rider;
        if (!$rider || $rider->id !== $route->rider_id) {
            abort(403, 'Access denied');
        }
    }

    private function authorizeStop(Request $request, RouteStop $stop): void
    {
        $rider = $request->user()->rider;
        if (!$rider || $rider->id !== $stop->route->rider_id) {
            abort(403, 'Access denied');
        }
    }

    private function fireStopUpdated(RouteStop $stop): void
    {
        try {
            $orgId = $stop->route->organization_id;
            event(new StopStatusUpdated($stop->load('task.facility', 'route.rider'), $orgId));
        } catch (\Exception $e) {
            Log::error('Failed to broadcast stop update: ' . $e->getMessage());
        }
    }

    private function broadcastEvent(string $eventName, int $orgId, array $data): void
    {
        try {
            \Illuminate\Support\Facades\Broadcast::channel("org.{$orgId}.live", function () {
                return true;
            });
            \Illuminate\Support\Facades\Event::dispatch(new \Illuminate\Broadcasting\BroadcastEvent(
                new class($eventName, $orgId, $data) implements \Illuminate\Contracts\Broadcasting\ShouldBroadcast {
                    public function __construct(
                        private string $name,
                        private int $orgId,
                        private array $payload
                    ) {}

                    public function broadcastOn(): array
                    {
                        return [new \Illuminate\Broadcasting\Channel("org.{$this->orgId}.live")];
                    }

                    public function broadcastAs(): string { return $this->name; }
                    public function broadcastWith(): array { return $this->payload; }
                }
            ));
        } catch (\Exception $e) {
            Log::error("Failed to broadcast {$eventName}: " . $e->getMessage());
        }
    }

    private function formatRoute(Route $route): array
    {
        return [
            'id' => $route->id,
            'date' => $route->date->format('Y-m-d'),
            'status' => $route->status,
            'depot_latitude' => (float) $route->depot_latitude,
            'depot_longitude' => (float) $route->depot_longitude,
            'planned_start_time' => $route->planned_start_time?->format('H:i'),
            'total_distance_km' => $route->total_distance_km,
            'stops' => $route->stops->map(fn($s) => $this->formatStop($s)),
        ];
    }

    private function formatStop(RouteStop $stop): array
    {
        $facility = $stop->task?->facility;
        return [
            'id' => $stop->id,
            'sequence' => $stop->sequence,
            'status' => $stop->status,
            'planned_arrival' => $stop->planned_arrival?->toISOString(),
            'actual_arrival' => $stop->actual_arrival?->toISOString(),
            'actual_departure' => $stop->actual_departure?->toISOString(),
            'fail_reason' => $stop->fail_reason,
            'fail_notes' => $stop->fail_notes,
            'has_pickup_photo' => $stop->custodyPhotos->where('photo_type', 'pickup')->isNotEmpty(),
            'has_delivery_photo' => $stop->custodyPhotos->where('photo_type', 'delivery')->isNotEmpty(),
            'facility' => $facility ? [
                'id' => $facility->id,
                'name' => $facility->name,
                'address_line_1' => $facility->address_line_1,
                'city' => $facility->city,
                'latitude' => (float) $facility->latitude,
                'longitude' => (float) $facility->longitude,
                'contact_name' => $facility->contact_name,
                'contact_phone' => $facility->contact_phone,
                'special_notes' => $facility->special_notes,
                'facility_type' => $facility->facility_type,
            ] : null,
            'task' => $stop->task ? [
                'id' => $stop->task->id,
                'type' => $stop->task->type,
                'priority' => $stop->task->priority,
                'notes' => $stop->task->notes,
            ] : null,
        ];
    }
}
