<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Rider;
use App\Models\Route;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Organization::query();

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $orgs = $query->withCount(['users', 'riders', 'facilities'])->latest()->paginate(25);

        $data = $orgs->map(function (Organization $org) {
            return $this->formatOrg($org);
        });

        return $this->paginated($orgs->setCollection($data));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'country' => 'required|string|max:100',
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'admin_phone' => 'nullable|string|max:20',
            'admin_password' => 'required|string|min:8',
            'subscription_plan' => 'required|in:starter,professional,enterprise',
            'service_city' => 'nullable|string|max:255',
            'service_lat' => 'nullable|numeric|between:-90,90',
            'service_lng' => 'nullable|numeric|between:-180,180',
            'service_radius_km' => 'nullable|integer|min:5|max:500',
        ]);

        $org = Organization::create([
            'name' => $request->name,
            'country' => $request->country,
            'subscription_plan' => $request->subscription_plan,
            'status' => 'active',
            'service_city' => $request->service_city,
            'service_lat' => $request->service_lat,
            'service_lng' => $request->service_lng,
            'service_radius_km' => $request->service_radius_km ?? 30,
        ]);

        $admin = User::create([
            'organization_id' => $org->id,
            'name' => $request->admin_name,
            'email' => $request->admin_email,
            'phone' => $request->admin_phone,
            'password' => bcrypt($request->admin_password),
            'is_active' => true,
        ]);
        $admin->assignRole('org_admin');

        return $this->success($this->formatOrg($org->load('users')), 'Organization created', 201);
    }

    public function show(Organization $organization): JsonResponse
    {
        $organization->loadCount(['users', 'riders', 'facilities', 'tasks']);
        return $this->success($this->formatOrg($organization));
    }

    public function update(Request $request, Organization $organization): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'country' => 'sometimes|string|max:100',
            'subscription_plan' => 'sometimes|in:starter,professional,enterprise',
            'primary_color' => 'sometimes|string|max:7',
            'service_city' => 'nullable|string|max:255',
            'service_lat' => 'nullable|numeric|between:-90,90',
            'service_lng' => 'nullable|numeric|between:-180,180',
            'service_radius_km' => 'nullable|integer|min:5|max:500',
        ]);

        $organization->update($request->only(['name', 'country', 'subscription_plan', 'primary_color', 'service_city', 'service_lat', 'service_lng', 'service_radius_km']));

        return $this->success($this->formatOrg($organization), 'Organization updated');
    }

    public function suspend(Organization $organization): JsonResponse
    {
        $organization->update(['status' => 'suspended']);
        return $this->success(null, 'Organization suspended');
    }

    public function activate(Organization $organization): JsonResponse
    {
        $organization->update(['status' => 'active']);
        return $this->success(null, 'Organization activated');
    }

    public function platformStats(): JsonResponse
    {
        return $this->success([
            'active_organizations' => Organization::where('status', 'active')->count(),
            'total_riders_today' => Rider::where('is_active', true)->count(),
            'tasks_processed_today' => Task::whereDate('scheduled_date', today())->count(),
            'platform_uptime' => '99.9%',
            'total_organizations' => Organization::count(),
            'suspended_organizations' => Organization::where('status', 'suspended')->count(),
        ]);
    }

    public function activateUser(User $user): JsonResponse
    {
        $user->update(['is_active' => true]);
        return $this->success(null, 'User activated');
    }

    public function deactivateUser(User $user): JsonResponse
    {
        $user->update(['is_active' => false]);
        return $this->success(null, 'User deactivated');
    }

    public function platformUsers(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        $query = User::with('organization')->orderByDesc('created_at');

        if ($request->search) {
            $query->where(fn($q) => $q->where('name', 'like', "%{$request->search}%")->orWhere('email', 'like', "%{$request->search}%"));
        }
        if ($request->organization_id) $query->where('organization_id', $request->organization_id);
        if ($request->role) $query->role($request->role);
        if ($request->status) $query->where('is_active', $request->status === 'active');

        $users = $query->paginate(30);
        $data = $users->map(fn($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'avatar_url' => $u->avatar_url,
            'role' => $u->getRoleName(),
            'organization' => $u->organization ? ['id' => $u->organization->id, 'name' => $u->organization->name] : null,
            'last_login_at' => $u->last_login_at,
            'is_active' => $u->is_active,
            'created_at' => $u->created_at,
        ]);

        return $this->paginated($users->setCollection($data));
    }

    private function formatOrg(Organization $org): array
    {
        $admin = $org->users->first(fn($u) => $u->hasRole('org_admin'));

        return [
            'id' => $org->id,
            'name' => $org->name,
            'country' => $org->country,
            'logo_url' => $org->logo_url,
            'primary_color' => $org->primary_color,
            'subdomain' => $org->subdomain,
            'status' => $org->status,
            'subscription_plan' => $org->subscription_plan,
            'max_riders' => $org->max_riders,
            'max_facilities' => $org->max_facilities,
            'max_tasks_per_month' => $org->max_tasks_per_month,
            'rider_count' => $org->riders_count ?? $org->riders()->count(),
            'user_count' => $org->users_count ?? $org->users()->count(),
            'facility_count' => $org->facilities_count ?? $org->facilities()->count(),
            'admin_name' => $admin?->name,
            'admin_email' => $admin?->email,
            'admin_phone' => $admin?->phone,
            'tasks_this_month' => $org->tasks()
                ->whereMonth('scheduled_date', now()->month)
                ->whereYear('scheduled_date', now()->year)
                ->count(),
            'service_city' => $org->service_city,
            'service_lat' => $org->service_lat ? (float)$org->service_lat : null,
            'service_lng' => $org->service_lng ? (float)$org->service_lng : null,
            'service_radius_km' => $org->service_radius_km,
            'created_at' => $org->created_at,
        ];
    }
}
