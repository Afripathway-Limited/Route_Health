<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\RiderInvitationMail;
use App\Models\Rider;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SuperAdminRiderController extends Controller {

    public function index(Request $request): JsonResponse {
        $query = Rider::with(['homeFacility', 'organization', 'user'])->latest();
        if ($request->search) {
            $query->where(fn($q) => $q
                ->where('name', 'like', "%{$request->search}%")
                ->orWhere('phone', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%")
            );
        }
        if ($request->status === 'active')   $query->where('is_active', true);
        elseif ($request->status === 'inactive') $query->where('is_active', false);

        $riders = $query->paginate(50);
        $data   = $riders->map(fn($r) => $this->formatRider($r));
        return $this->paginated($riders->setCollection($data));
    }

    public function store(Request $request): JsonResponse {
        $request->validate([
            'name'              => 'required|string|max:255',
            'email'             => 'required|email|unique:users,email|unique:riders,email',
            'phone'             => 'required|string|max:20',
            'vehicle_type'      => 'required|in:motorbike,bicycle,car,van',
            'coverage_city'     => 'nullable|string|max:255',
            'coverage_lat'      => 'nullable|numeric|between:-90,90',
            'coverage_lng'      => 'nullable|numeric|between:-180,180',
            'coverage_radius_km'=> 'nullable|integer|min:1|max:500',
            'availability_status' => 'nullable|in:free,on_route,busy,unavailable',
            'notes'             => 'nullable|string',
        ]);

        $inviteToken = Str::random(48);

        // Create inactive user account — activated when rider accepts invitation
        $user = User::create([
            'name'                  => $request->name,
            'email'                 => $request->email,
            'password'              => bcrypt(Str::random(24)),
            'is_active'             => false,
            'requires_password_change' => false,
            'invitation_token'      => $inviteToken,
            'invitation_expires_at' => now()->addDays(7),
        ]);
        $user->assignRole('rider');

        // Create rider (inactive until invitation accepted)
        $rider = Rider::create([
            ...$request->only(['name','phone','vehicle_type','coverage_city','coverage_lat','coverage_lng','coverage_radius_km','availability_status','notes']),
            'email'           => $request->email,
            'organization_id' => null,
            'user_id'         => $user->id,
            'is_active'       => false,
        ]);

        // Send invitation email (gracefully skip on mail config issues)
        $inviteUrl = config('app.frontend_url', 'http://localhost:3000') . '/accept-invitation/' . $inviteToken;
        try {
            Mail::to($request->email)->queue(new RiderInvitationMail($user, $rider, $inviteUrl));
        } catch (\Throwable) {
            // Mail not configured — invitation link returned in response for manual sharing
        }

        return $this->success(
            array_merge($this->formatRider($rider), ['invite_url' => $inviteUrl]),
            'Rider created — invitation sent to ' . $request->email,
            201
        );
    }

    public function show(Rider $rider): JsonResponse {
        return $this->success($this->formatRider($rider->load(['homeFacility', 'organization', 'user'])));
    }

    public function update(Request $request, Rider $rider): JsonResponse {
        $rider->load('user');

        $request->validate([
            'name'               => 'sometimes|string|max:255',
            'phone'              => 'sometimes|string|max:20',
            'vehicle_type'       => 'sometimes|in:motorbike,bicycle,car,van',
            'coverage_city'      => 'nullable|string|max:255',
            'coverage_lat'       => 'nullable|numeric|between:-90,90',
            'coverage_lng'       => 'nullable|numeric|between:-180,180',
            'coverage_radius_km' => 'nullable|integer|min:1|max:500',
            'availability_status'=> 'nullable|in:free,on_route,busy,unavailable',
            'is_active'          => 'sometimes|boolean',
            'email'              => 'nullable|email|unique:users,email,' . ($rider->user?->id ?? 'NULL'),
            'password'           => 'nullable|string|min:8',
        ]);

        $rider->update($request->only([
            'name','phone','vehicle_type','coverage_city','coverage_lat',
            'coverage_lng','coverage_radius_km','availability_status','is_active','notes',
        ]));

        // Sync email on rider record
        if ($request->filled('email')) {
            $rider->update(['email' => $request->email]);
        }

        // Update or create linked user for email/password
        if ($request->filled('email') || $request->filled('password')) {
            if ($rider->user) {
                $userUpdates = [];
                if ($request->filled('email'))    $userUpdates['email']    = $request->email;
                if ($request->filled('name'))     $userUpdates['name']     = $request->name;
                if ($request->filled('password')) $userUpdates['password'] = Hash::make($request->password);
                $rider->user->update($userUpdates);
            } elseif ($request->filled('email')) {
                // No linked user yet — create one
                $user = User::create([
                    'name'                    => $rider->name,
                    'email'                   => $request->email,
                    'password'                => Hash::make($request->filled('password') ? $request->password : Str::random(16)),
                    'is_active'               => true,
                    'requires_password_change' => !$request->filled('password'),
                ]);
                $user->assignRole('rider');
                $rider->update(['user_id' => $user->id]);
            }
        }

        return $this->success($this->formatRider($rider->load('user')), 'Rider updated');
    }

    public function destroy(Rider $rider): JsonResponse {
        // Also remove linked user account
        if ($rider->user_id) {
            User::find($rider->user_id)?->delete();
        }
        $rider->delete();
        return $this->success(null, 'Rider deleted');
    }

    public function resendInvitation(Rider $rider): JsonResponse {
        $user = User::find($rider->user_id);
        if (!$user || $user->is_active) {
            return $this->error('No pending invitation for this rider', 422);
        }

        $inviteToken = Str::random(48);
        $user->update([
            'invitation_token'      => $inviteToken,
            'invitation_expires_at' => now()->addDays(7),
        ]);

        $inviteUrl = config('app.frontend_url', 'http://localhost:3000') . '/accept-invitation/' . $inviteToken;
        try {
            Mail::to($user->email)->queue(new RiderInvitationMail($user, $rider, $inviteUrl));
        } catch (\Throwable) {}

        return $this->success(['invite_url' => $inviteUrl], 'Invitation resent');
    }

    private function formatRider(Rider $r): array {
        $invitationPending = $r->user_id && !optional($r->user)->is_active;
        return [
            'id'                  => $r->id,
            'name'                => $r->name,
            'email'               => $r->email,
            'phone'               => $r->phone,
            'vehicle_type'        => $r->vehicle_type,
            'coverage_city'       => $r->coverage_city,
            'coverage_lat'        => $r->coverage_lat  ? (float)$r->coverage_lat  : null,
            'coverage_lng'        => $r->coverage_lng  ? (float)$r->coverage_lng  : null,
            'coverage_radius_km'  => $r->coverage_radius_km,
            'availability_status' => $r->availability_status ?? 'free',
            'is_active'           => $r->is_active,
            'invitation_pending'  => $invitationPending,
            'notes'               => $r->notes,
            'photo_url'           => $r->photo_url,
            'org_name'            => $r->organization?->name,
            'tasks_this_month'    => $r->tasks_this_month_count,
            'on_time_rate'        => $r->on_time_rate,
            'created_at'          => $r->created_at,
        ];
    }
}
