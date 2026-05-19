<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\RouteStop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = Facility::forOrganization($orgId);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('city', 'like', "%{$request->search}%");
            });
        }

        if ($request->facility_type) {
            $query->where('facility_type', $request->facility_type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $facilities = $query->latest()->paginate(50);

        $data = $facilities->map(fn($f) => $this->formatFacility($f));

        return $this->paginated($facilities->setCollection($data));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'address_line_1' => 'required|string|max:255',
            'address_line_2' => 'nullable|string|max:255',
            'city' => 'required|string|max:100',
            'country' => 'required|string|max:100',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'facility_type' => 'required|in:lab,clinic,hospital,pharmacy',
            'contact_name' => 'required|string|max:255',
            'contact_phone' => 'required|string|max:20',
            'special_notes' => 'nullable|string',
        ]);

        $facility = Facility::create([
            ...$request->only([
                'name', 'address_line_1', 'address_line_2', 'city', 'country',
                'latitude', 'longitude', 'facility_type', 'contact_name',
                'contact_phone', 'special_notes',
            ]),
            'organization_id' => $request->user()->organization_id,
            'is_active' => true,
        ]);

        return $this->success($this->formatFacility($facility), 'Facility created', 201);
    }

    public function show(Request $request, Facility $facility): JsonResponse
    {
        $this->authorizeOrg($request, $facility);
        return $this->success($this->formatFacility($facility));
    }

    public function update(Request $request, Facility $facility): JsonResponse
    {
        $this->authorizeOrg($request, $facility);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'address_line_1' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:100',
            'country' => 'sometimes|string|max:100',
            'latitude' => 'sometimes|numeric|between:-90,90',
            'longitude' => 'sometimes|numeric|between:-180,180',
            'facility_type' => 'sometimes|in:lab,clinic,hospital,pharmacy',
            'contact_name' => 'sometimes|string|max:255',
            'contact_phone' => 'sometimes|string|max:20',
            'special_notes' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $facility->update($request->only([
            'name', 'address_line_1', 'address_line_2', 'city', 'country',
            'latitude', 'longitude', 'facility_type', 'contact_name',
            'contact_phone', 'special_notes', 'is_active',
        ]));

        return $this->success($this->formatFacility($facility), 'Facility updated');
    }

    public function destroy(Request $request, Facility $facility): JsonResponse
    {
        $this->authorizeOrg($request, $facility);
        $facility->update(['is_active' => false]);
        return $this->success(null, 'Facility deactivated');
    }

    public function history(Request $request, Facility $facility): JsonResponse
    {
        $this->authorizeOrg($request, $facility);

        $stops = RouteStop::whereHas('task', fn($q) => $q->where('facility_id', $facility->id))
            ->with(['task', 'route.rider', 'custodyPhotos'])
            ->latest('planned_arrival')
            ->paginate(30);

        $data = $stops->map(fn($stop) => [
            'id' => $stop->id,
            'date' => $stop->planned_arrival?->format('Y-m-d'),
            'time' => $stop->actual_arrival?->format('g:i A') ?? $stop->planned_arrival?->format('g:i A'),
            'rider_name' => $stop->route?->rider?->name,
            'rider_photo' => $stop->route?->rider?->photo_url,
            'status' => $stop->status,
            'has_photos' => $stop->custodyPhotos->isNotEmpty(),
            'delay_minutes' => $stop->delay_minutes,
        ]);

        return $this->paginated($stops->setCollection($data), 'Pickup history');
    }

    private function formatFacility(Facility $f): array
    {
        return [
            'id' => $f->id,
            'name' => $f->name,
            'address_line_1' => $f->address_line_1,
            'address_line_2' => $f->address_line_2,
            'city' => $f->city,
            'country' => $f->country,
            'latitude' => (float) $f->latitude,
            'longitude' => (float) $f->longitude,
            'facility_type' => $f->facility_type,
            'contact_name' => $f->contact_name,
            'contact_phone' => $f->contact_phone,
            'special_notes' => $f->special_notes,
            'is_active' => $f->is_active,
            'pickups_this_month' => $f->pickups_this_month_count,
            'created_at' => $f->created_at,
        ];
    }

    private function authorizeOrg(Request $request, Facility $facility): void
    {
        if ($facility->organization_id !== $request->user()->organization_id) {
            abort(403, 'Access denied');
        }
    }
}
