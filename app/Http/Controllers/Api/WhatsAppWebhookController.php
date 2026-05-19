<?php

namespace App\Http\Controllers\Api;

use App\Events\StopStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\RouteStop;
use App\Models\WhatsappConfirmation;
use App\Models\WhatsappLog;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    public function handle(Request $request)
    {
        // Twilio webhook format
        $from = $request->input('From', '');
        $body = trim($request->input('Body', ''));

        // Strip WhatsApp prefix
        $phone = str_replace('whatsapp:', '', $from);

        Log::info('WhatsApp webhook received', ['from' => $phone, 'body' => $body]);

        // Normalize response
        $normalizedBody = strtolower(trim($body));
        $response = null;

        if (in_array($normalizedBody, ['yes', 'y', '1', 'ok', 'confirmed', 'received'])) {
            $response = 'yes';
        } elseif (in_array($normalizedBody, ['no', 'n', '0', 'dispute', 'not received', 'dispute'])) {
            $response = 'no';
        }

        if (!$response) {
            // Unknown reply - ignore
            return response('', 200);
        }

        // Find the pending stop confirmation for this phone
        $pendingStop = RouteStop::whereHas('task.facility', fn($q) => $q->where('contact_phone', $phone))
            ->whereHas('route', fn($q) => $q->whereDate('date', today()))
            ->where('status', 'delivered')
            ->whereDoesntHave('whatsappConfirmation')
            ->with(['route', 'task.facility'])
            ->latest('planned_arrival')
            ->first();

        if (!$pendingStop) {
            Log::info('No pending confirmation found for phone: ' . $phone);
            return response('', 200);
        }

        $orgId = $pendingStop->route?->organization_id;
        if (!$orgId) return response('', 200);

        DB::transaction(function () use ($response, $pendingStop, $orgId, $phone, $body) {
            WhatsappConfirmation::create([
                'route_stop_id' => $pendingStop->id,
                'organization_id' => $orgId,
                'from_phone' => $phone,
                'response' => $response,
                'raw_message' => $body,
                'received_at' => now(),
                'processed_at' => now(),
            ]);

            $newStatus = $response === 'yes' ? 'confirmed_delivered' : 'disputed';
            $pendingStop->update(['status' => $newStatus]);

            // Fire real-time event
            try {
                event(new StopStatusUpdated($pendingStop->fresh(), $orgId));
            } catch (\Exception $e) {
                Log::error('Pusher event failed: ' . $e->getMessage());
            }

            // If dispute, send alert to dispatcher
            if ($response === 'no') {
                $org = Organization::find($orgId);
                if ($org) {
                    $service = new WhatsAppService($org);
                    $service->sendDisputeAlert($pendingStop);
                }
            }
        });

        return response('', 200);
    }
}
