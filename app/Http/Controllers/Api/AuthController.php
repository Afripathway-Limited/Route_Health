<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->with('organization')->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return $this->error('Invalid email or password', 401);
        }

        if (!$user->is_active) {
            return $this->error('Your account has been deactivated. Contact your administrator.', 403);
        }

        if ($user->organization && !$user->organization->isActive()) {
            return $this->error('Your organization account has been suspended. Contact support.', 403);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth_token')->plainTextToken;

        if ($user->requires_password_change) {
            return $this->success([
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => $this->formatUser($user),
                'redirect' => '/set-password',
            ], 'Login successful');
        }

        $roleName = $user->getRoleName();
        $redirectPath = match($roleName) {
            'super_admin'  => '/super-admin',
            'org_admin'    => '/admin',
            'dispatcher'   => '/dispatcher',
            'lab_manager'  => '/lab-manager',
            'rider'        => '/driver',
            default        => '/dashboard',
        };

        return $this->success([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatUser($user),
            'redirect' => $redirectPath,
        ], 'Login successful');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('organization');
        return $this->success($this->formatUser($user));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return $this->success(null, 'Logged out successfully');
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email|exists:users,email']);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return $this->success(null, 'Password reset link sent to your email');
        }

        return $this->error('Unable to send reset link. Please try again.', 422);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|confirmed|min:8',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return $this->success(null, 'Password reset successfully');
        }

        return $this->error('Invalid or expired reset token', 422);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|nullable|string|max:20',
        ]);

        $user->update($request->only(['name', 'phone']));

        return $this->success($this->formatUser($user->load('organization')), 'Profile updated');
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        $skipCurrent = $request->boolean('skip_current') && $user->requires_password_change;

        if ($skipCurrent) {
            $request->validate(['password' => 'required|confirmed|min:8']);
        } else {
            $request->validate([
                'current_password' => 'required|string',
                'password' => 'required|confirmed|min:8',
            ]);

            if (!Hash::check($request->current_password, $user->password)) {
                return $this->error('Current password is incorrect', 422);
            }
        }

        $user->update([
            'password' => Hash::make($request->password),
            'requires_password_change' => false,
        ]);
        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return $this->success(null, 'Password updated successfully');
    }

    public function acceptInvitation(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => 'required|string',
            'password' => 'required|string|min:8',
        ]);

        $user = User::where('invitation_token', $request->token)
            ->where('invitation_expires_at', '>', now())
            ->first();

        if (!$user) {
            return $this->error('This invitation link is invalid or has expired.', 422);
        }

        $user->update([
            'password'              => Hash::make($request->password),
            'is_active'             => true,
            'invitation_token'      => null,
            'invitation_expires_at' => null,
            'requires_password_change' => false,
            'last_login_at'         => now(),
        ]);

        // Activate the linked rider
        if ($user->rider) {
            $user->rider->update(['is_active' => true]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->success([
            'token'      => $token,
            'token_type' => 'Bearer',
            'user'       => $this->formatUser($user->load('organization')),
            'redirect'   => '/driver',
        ], 'Account activated — welcome to RouteHealth!');
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar_url' => $user->avatar_url,
            'role' => $user->getRoleName(),
            'roles' => $user->getRoleNames()->values(),
            'requires_password_change' => (bool) $user->requires_password_change,
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'organization' => $user->organization ? [
                'id' => $user->organization->id,
                'name' => $user->organization->name,
                'logo_url' => $this->resolveStorageUrl($user->organization->logo_url),
                'primary_color' => $user->organization->primary_color,
                'status' => $user->organization->status,
                'subdomain' => $user->organization->subdomain,
                'country' => $user->organization->country,
                'service_city' => $user->organization->service_city,
                'service_lat' => $user->organization->service_lat ? (float) $user->organization->service_lat : null,
                'service_lng' => $user->organization->service_lng ? (float) $user->organization->service_lng : null,
                'service_radius_km' => $user->organization->service_radius_km ? (int) $user->organization->service_radius_km : 30,
            ] : null,
        ];
    }

}
