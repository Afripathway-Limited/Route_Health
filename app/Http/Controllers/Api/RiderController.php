<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rider;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class RiderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $org   = $user->organization;
        $orgId = $user->organization_id;

        // Org's own riders + platform riders (organization_id IS NULL)
        $query = Rider::where(fn($q) => $q
            ->where('organization_id', $orgId)
            ->orWhereNull('organization_id')
        );

        if ($request->search) {
            $query->where(fn($q) => $q
                ->where('name', 'like', "%{$request->search}%")
                ->orWhere('phone', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%")
                ->orWhere('coverage_city', 'like', "%{$request->search}%")
            );
        }

        if ($request->status === 'active')   $query->where('is_active', true);
        elseif ($request->status === 'inactive') $query->where('is_active', false);

        $riders = $query->latest()->get();

        // Geo-filter platform riders by org service area; always include own riders
        if ($org?->service_lat && $org?->service_lng) {
            $oLat    = (float) $org->service_lat;
            $oLng    = (float) $org->service_lng;
            $oRadius = (float) ($org->service_radius_km ?? 30);

            $riders = $riders->filter(function (Rider $r) use ($orgId, $oLat, $oLng, $oRadius) {
                // Always include this org's own riders
                if ($r->organization_id === $orgId) return true;
                // Platform riders: filter by coverage overlap
                if (!$r->coverage_lat || !$r->coverage_lng) return true;
                $dist = $this->haversineKm((float)$r->coverage_lat, (float)$r->coverage_lng, $oLat, $oLng);
                return $dist <= ((float)($r->coverage_radius_km ?? 20) + $oRadius);
            })->values();
        }

        return $this->success($riders->map(fn($r) => $this->formatRider($r)));
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'             => 'required|string|max:255',
            'phone'            => 'required|string|max:20',
            'vehicle_type'     => 'required|in:motorbike,bicycle,car,van',
            'home_facility_id' => 'nullable|exists:facilities,id',
            'notes'            => 'nullable|string',
            'photo_url'        => 'nullable|url',
            'email'            => 'nullable|email|unique:users,email',
            'password'         => 'nullable|string|min:8',
        ]);

        $userId = null;
        if ($request->filled('email')) {
            $user = User::create([
                'name'                    => $request->name,
                'email'                   => $request->email,
                'organization_id'         => $request->user()->organization_id,
                'password'                => Hash::make($request->filled('password') ? $request->password : \Illuminate\Support\Str::random(16)),
                'is_active'               => true,
                'requires_password_change' => !$request->filled('password'),
            ]);
            $user->assignRole('rider');
            $userId = $user->id;
        }

        $rider = Rider::create([
            ...$request->only(['name', 'phone', 'vehicle_type', 'home_facility_id', 'notes', 'photo_url']),
            'organization_id' => $request->user()->organization_id,
            'email'           => $request->email,
            'user_id'         => $userId,
            'is_active'       => true,
        ]);

        return $this->success($this->formatRider($rider->load('homeFacility')), 'Rider created', 201);
    }

    public function show(Request $request, Rider $rider): JsonResponse
    {
        $this->authorizeOrg($request, $rider);
        return $this->success($this->formatRider($rider->load('homeFacility', 'user')));
    }

    public function update(Request $request, Rider $rider): JsonResponse
    {
        $this->authorizeOrg($request, $rider);
        $rider->load('user');

        $request->validate([
            'name'             => 'sometimes|string|max:255',
            'phone'            => 'sometimes|string|max:20',
            'vehicle_type'     => 'sometimes|in:motorbike,bicycle,car,van',
            'home_facility_id' => 'nullable|exists:facilities,id',
            'notes'            => 'nullable|string',
            'photo_url'        => 'nullable|url',
            'email'            => 'nullable|email|unique:users,email,' . ($rider->user?->id ?? 'NULL'),
            'password'         => 'nullable|string|min:8',
        ]);

        $rider->update($request->only(['name', 'phone', 'vehicle_type', 'home_facility_id', 'notes', 'photo_url']));

        if ($request->filled('email')) {
            if ($rider->user_id && $rider->user) {
                // Update existing linked user
                $updates = ['email' => $request->email];
                if ($request->filled('name')) $updates['name'] = $request->name;
                if ($request->filled('password')) $updates['password'] = Hash::make($request->password);
                $rider->user->update($updates);
            } else {
                // Create a new linked user — inherit rider's org (null for platform riders)
                $user = User::create([
                    'name'                    => $rider->name,
                    'email'                   => $request->email,
                    'organization_id'         => $rider->organization_id,
                    'password'                => Hash::make($request->filled('password') ? $request->password : \Illuminate\Support\Str::random(16)),
                    'is_active'               => true,
                    'requires_password_change' => !$request->filled('password'),
                ]);
                $user->assignRole('rider');
                $rider->update(['user_id' => $user->id, 'email' => $request->email]);
            }
        } elseif ($request->filled('password') && $rider->user_id && $rider->user) {
            // Password-only update (no email change)
            $rider->user->update(['password' => Hash::make($request->password)]);
        }

        // Sync rider email field
        if ($request->filled('email')) {
            $rider->update(['email' => $request->email]);
        }

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
        return [
            'id'                  => $r->id,
            'name'                => $r->name,
            'email'               => $r->email,
            'phone'               => $r->phone,
            'vehicle_type'        => $r->vehicle_type,
            'coverage_city'       => $r->coverage_city,
            'coverage_lat'        => $r->coverage_lat ? (float) $r->coverage_lat : null,
            'coverage_lng'        => $r->coverage_lng ? (float) $r->coverage_lng : null,
            'coverage_radius_km'  => $r->coverage_radius_km ?? 20,
            'availability_status' => $r->availability_status ?? 'free',
            'is_active'           => $r->is_active,
            'has_login'           => (bool) $r->user_id,
            'tasks_this_month'    => $r->tasks_this_month_count,
            'on_time_rate'        => $r->on_time_rate,
            'created_at'          => $r->created_at,
        ];
    }

    private function authorizeOrg(Request $request, Rider $rider): void
    {
        $userOrgId = $request->user()->organization_id;
        // Allow: own org rider, or platform rider (null org) visible to any org
        if ($rider->organization_id !== null && $rider->organization_id !== $userOrgId) {
            abort(403, 'Access denied');
        }
    }
}
