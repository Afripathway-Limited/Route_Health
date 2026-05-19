<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rider;
use App\Models\Route;
use App\Models\RouteStop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RiderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = Rider::forOrganization($orgId)->with('homeFacility');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%");
            });
        }

        if ($request->status === 'active') {
            $query->where('is_active', true);
        } elseif ($request->status === 'inactive') {
            $query->where('is_active', false);
        } elseif ($request->status === 'on_route') {
            $query->whereHas('routes', fn($q) => $q->where('status', 'in_progress'));
        }

        $riders = $query->latest()->paginate(50);
        $data = $riders->map(fn($r) => $this->formatRider($r));

        return $this->paginated($riders->setCollection($data));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'vehicle_type' => 'required|in:motorbike,bicycle,car,van',
            'home_facility_id' => 'nullable|exists:facilities,id',
            'notes' => 'nullable|string',
            'photo_url' => 'nullable|url',
        ]);

        $rider = Rider::create([
            ...$request->only(['name', 'phone', 'vehicle_type', 'home_facility_id', 'notes', 'photo_url']),
            'organization_id' => $request->user()->organization_id,
            'is_active' => true,
        ]);

        return $this->success($this->formatRider($rider->load('homeFacility')), 'Rider created', 201);
    }

    public function show(Request $request, Rider $rider): JsonResponse
    {
        $this->authorizeOrg($request, $rider);
        return $this->success($this->formatRider($rider->load('homeFacility')));
    }

    public function update(Request $request, Rider $rider): JsonResponse
    {
        $this->authorizeOrg($request, $rider);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'vehicle_type' => 'sometimes|in:motorbike,bicycle,car,van',
            'home_facility_id' => 'nullable|exists:facilities,id',
            'notes' => 'nullable|string',
            'photo_url' => 'nullable|url',
        ]);

        $rider->update($request->only(['name', 'phone', 'vehicle_type', 'home_facility_id', 'notes', 'photo_url']));

        return $this->success($this->formatRider($rider->load('homeFacility')), 'Rider updated');
    }

    public function activate(Request $request, Rider $rider): JsonResponse
    {
        $this->authorizeOrg($request, $rider);
        $rider->update(['is_active' => true]);
        return $this->success(null, 'Rider activated');
    }

    public function deactivate(Request $request, Rider $rider): JsonResponse
    {
        $this->authorizeOrg($request, $rider);
        $rider->update(['is_active' => false]);
        return $this->success(null, 'Rider deactivated');
    }

    public function performance(Request $request, Rider $rider): JsonResponse
    {
        $this->authorizeOrg($request, $rider);

        $routes = Route::where('rider_id', $rider->id)
            ->withCount(['stops'])
            ->latest('date')
            ->limit(30)
            ->get();

        $stops = RouteStop::whereHas('route', fn($q) => $q->where('rider_id', $rider->id))
            ->whereNotNull('actual_arrival')
            ->get();

        $onTime = $stops->filter(fn($s) => $s->actual_arrival <= $s->planned_arrival)->count();
        $onTimeRate = $stops->count() > 0 ? round(($onTime / $stops->count()) * 100, 1) : 100;

        $avgDelay = $stops->filter(fn($s) => $s->delay_minutes !== null)->avg('delay_minutes');

        return $this->success([
            'on_time_rate' => $onTimeRate,
            'total_completed_stops' => $stops->count(),
            'avg_delay_minutes' => round($avgDelay ?? 0, 1),
            'tasks_this_month' => $rider->tasks_this_month_count,
            'recent_routes' => $routes->map(fn($r) => [
                'id' => $r->id,
                'date' => $r->date->format('Y-m-d'),
                'status' => $r->status,
                'stops_count' => $r->stops_count,
                'total_distance_km' => $r->total_distance_km,
            ]),
        ]);
    }

    private function formatRider(Rider $r): array
    {
        $onRoute = Route::where('rider_id', $r->id)->where('status', 'in_progress')->exists();

        return [
            'id' => $r->id,
            'name' => $r->name,
            'phone' => $r->phone,
            'vehicle_type' => $r->vehicle_type,
            'home_facility' => $r->homeFacility ? [
                'id' => $r->homeFacility->id,
                'name' => $r->homeFacility->name,
                'city' => $r->homeFacility->city,
            ] : null,
            'home_facility_id' => $r->home_facility_id,
            'photo_url' => $r->photo_url,
            'notes' => $r->notes,
            'is_active' => $r->is_active,
            'current_status' => $onRoute ? 'on_route' : ($r->is_active ? 'available' : 'inactive'),
            'tasks_this_month' => $r->tasks_this_month_count,
            'on_time_rate' => $r->on_time_rate,
            'created_at' => $r->created_at,
        ];
    }

    private function authorizeOrg(Request $request, Rider $rider): void
    {
        if ($rider->organization_id !== $request->user()->organization_id) {
            abort(403, 'Access denied');
        }
    }
}
