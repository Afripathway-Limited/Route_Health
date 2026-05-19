<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\InviteUserMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class UserManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $users = User::where('organization_id', $orgId)
            ->with('roles')
            ->latest()
            ->get();

        return $this->success($users->map(fn($u) => $this->formatUser($u)));
    }

    public function invite(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:org_admin,dispatcher',
        ]);

        $tempPassword = Str::random(12);

        $user = User::create([
            'organization_id' => $orgId,
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($tempPassword),
            'is_active' => true,
            'requires_password_change' => true,
        ]);

        $user->assignRole($request->role);

        $org = $request->user()->organization;
        if ($org) {
            Mail::to($user->email)->queue(new InviteUserMail($user, $tempPassword, $org));
        }

        return $this->success($this->formatUser($user->load('roles')), 'User invited successfully', 201);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $this->verifyOrg($request, $user);

        $request->validate(['role' => 'required|in:org_admin,dispatcher,lab_manager']);

        $user->syncRoles([$request->role]);

        return $this->success($this->formatUser($user->load('roles')), 'Role updated');
    }

    public function activate(Request $request, User $user): JsonResponse
    {
        $this->verifyOrg($request, $user);
        $user->update(['is_active' => true]);
        return $this->success(null, 'User activated');
    }

    public function deactivate(Request $request, User $user): JsonResponse
    {
        $this->verifyOrg($request, $user);
        if ($user->id === $request->user()->id) {
            return $this->error('Cannot deactivate your own account', 422);
        }
        $user->update(['is_active' => false]);
        $user->tokens()->delete();
        return $this->success(null, 'User deactivated');
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->verifyOrg($request, $user);

        if ($user->id === $request->user()->id) {
            return $this->error('Cannot remove your own account', 422);
        }

        $user->update(['is_active' => false]);
        $user->tokens()->delete();

        return $this->success(null, 'User removed');
    }

    private function formatUser(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'avatar_url' => $u->avatar_url,
            'role' => $u->getRoleName(),
            'is_active' => $u->is_active,
            'last_login_at' => $u->last_login_at,
            'created_at' => $u->created_at,
        ];
    }

    private function verifyOrg(Request $request, User $user): void
    {
        if ($user->organization_id !== $request->user()->organization_id) {
            abort(403, 'Access denied');
        }
    }
}
