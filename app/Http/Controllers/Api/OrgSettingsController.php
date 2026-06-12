<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OrgSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $org = $request->user()->organization;

        if (!$org) {
            return $this->error('No organization found', 404);
        }

        return $this->success([
            'id' => $org->id,
            'name' => $org->name,
            'country' => $org->country,
            'logo_url' => $this->resolveStorageUrl($org->logo_url),
            'primary_color' => $org->primary_color,
            'subdomain' => $org->subdomain,
            'whatsapp_phone' => $org->whatsapp_phone,
            'whatsapp_provider' => $org->whatsapp_provider,
            'notification_preferences' => $org->notification_preferences ?? [],
            'photo_retention_months' => $org->photo_retention_months ?? null,
            'subscription_plan' => $org->subscription_plan,
        ]);
    }


    public function update(Request $request): JsonResponse
    {
        $org = $request->user()->organization;

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'country' => 'sometimes|string|max:100',
            'whatsapp_phone' => 'nullable|string|max:20',
        ]);

        $org->update($request->only(['name', 'country', 'whatsapp_phone']));

        return $this->success(null, 'Organization profile updated');
    }

    public function updateBranding(Request $request): JsonResponse
    {
        $org = $request->user()->organization;

        $request->validate([
            'primary_color' => 'sometimes|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'subdomain'     => 'sometimes|nullable|string|max:50|alpha_dash|unique:organizations,subdomain,' . $org->id,
            'logo_url'      => 'sometimes|nullable|url',
        ]);

        $org->update($request->only(['primary_color', 'subdomain', 'logo_url']));

        $fresh = $org->fresh();
        return $this->success([
            'logo_url'      => $this->resolveStorageUrl($fresh->logo_url),
            'primary_color' => $fresh->primary_color,
            'subdomain'     => $fresh->subdomain,
        ], 'Branding updated');
    }

    /**
     * POST /settings/logo — separate endpoint because PHP only parses multipart on POST, not PUT.
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $org = $request->user()->organization;

        $request->validate(['logo' => 'required|image|max:4096|mimes:jpeg,png,svg,webp']);
        $file     = $request->file('logo');
        $filename = "logo_{$org->id}_" . time() . '.' . $file->getClientOriginalExtension();
        $path     = "organizations/{$org->id}/logos/{$filename}";

        if (config('filesystems.default') === 's3' && config('filesystems.disks.s3.bucket')) {
            Storage::disk('s3')->put($path, file_get_contents($file->getRealPath()), 'public');
            $logoUrl = Storage::disk('s3')->url($path);
        } else {
            $localPath = "logos/{$filename}";
            Storage::disk('public')->put($localPath, file_get_contents($file->getRealPath()));
            $logoUrl = Storage::disk('public')->url($localPath);
        }

        $org->update(['logo_url' => $logoUrl]);

        return $this->success(['logo_url' => $this->resolveStorageUrl($logoUrl)], 'Logo uploaded');
    }

    public function updateWhatsapp(Request $request): JsonResponse
    {
        $org = $request->user()->organization;

        $request->validate([
            'whatsapp_phone' => 'required|string|max:20',
            'whatsapp_token' => 'required|string',
            'whatsapp_provider' => 'required|in:twilio,meta',
        ]);

        $org->update($request->only(['whatsapp_phone', 'whatsapp_token', 'whatsapp_provider']));

        return $this->success(null, 'WhatsApp configuration updated');
    }

    public function updateNotifications(Request $request): JsonResponse
    {
        $org = $request->user()->organization;

        $org->update([
            'notification_preferences' => $request->preferences ?? [],
        ]);

        return $this->success(null, 'Notification preferences updated');
    }

    public function testWhatsapp(Request $request): JsonResponse
    {
        $org = $request->user()->organization;

        if (!$org->whatsapp_token || !$org->whatsapp_phone) {
            return $this->error('WhatsApp not configured. Please save your configuration first.', 422);
        }

        try {
            $whatsappService = app(\App\Services\WhatsAppService::class, ['organization' => $org]);
            $whatsappService->sendTest($request->user()->phone ?? $org->whatsapp_phone);
            return $this->success(null, 'Test message sent successfully');
        } catch (\Exception $e) {
            return $this->error('Failed to send test message: ' . $e->getMessage(), 422);
        }
    }
}
