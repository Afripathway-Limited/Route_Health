<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Rider;
use App\Models\RouteStop;
use App\Models\WhatsappLog;
use Illuminate\Support\Facades\Log;
use Twilio\Rest\Client as TwilioClient;

class WhatsAppService
{
    private ?TwilioClient $twilio = null;

    public function __construct(private readonly Organization $organization)
    {
    }

    public function sendDispatchNotification(Rider $rider, int $stopCount, string $date): void
    {
        $body = "🚀 Hello {$rider->name}! Your route for {$date} is ready. You have {$stopCount} stops. Please open the RouteHealth app to begin. Good luck!";

        $this->send($rider->phone, 'dispatch', $body, null, $rider->id);
    }

    public function sendOnTheWayNotification(RouteStop $stop, string $eta): void
    {
        $rider = $stop->route?->rider;
        $facility = $stop->task?->facility;

        if (!$rider || !$facility) return;

        $body = "🚗 {$rider->name} has collected your sample from {$facility->name} and is on the way. Estimated arrival: {$eta}.";

        $this->send($facility->contact_phone, 'on_way', $body, $stop->id, $rider->id);
    }

    public function sendDeliveryConfirmationRequest(RouteStop $stop): void
    {
        $rider = $stop->route?->rider;
        $facility = $stop->task?->facility;

        if (!$rider || !$facility) return;

        $body = "✅ {$rider->name} has marked your sample as delivered. Did you receive it? Reply *YES* to confirm or *NO* to dispute.";

        $this->send($facility->contact_phone, 'delivery_confirmation', $body, $stop->id, $rider->id);
    }

    public function sendFailedPickupAlert(RouteStop $stop, string $reason): void
    {
        $rider = $stop->route?->rider;
        $facility = $stop->task?->facility;

        if (!$rider || !$facility) return;

        $dispatcherPhone = $this->organization->whatsapp_phone;
        if (!$dispatcherPhone) return;

        $body = "⚠️ {$rider->name} was unable to complete pickup at {$facility->name}. Reason: {$reason}. Please review Route #{$stop->route_id}.";

        $this->send($dispatcherPhone, 'failed_alert', $body, $stop->id, $rider->id);
    }

    public function sendDisputeAlert(RouteStop $stop): void
    {
        $rider = $stop->route?->rider;
        $facility = $stop->task?->facility;

        if (!$rider || !$facility) return;

        $dispatcherPhone = $this->organization->whatsapp_phone;
        if (!$dispatcherPhone) return;

        $stopSequence = $stop->sequence ?? '?';
        $body = "🚨 DISPUTE ALERT: {$facility->name} reports they did NOT receive their sample from {$rider->name}. Route #{$stop->route_id}, Stop #{$stopSequence}. Please investigate immediately.";

        $this->send($dispatcherPhone, 'dispute_alert', $body, $stop->id, $rider->id);
    }

    public function sendTest(string $toPhone): void
    {
        $body = "✅ RouteHealth WhatsApp integration is working correctly. This is a test message from {$this->organization->name}.";
        $this->send($toPhone, 'dispatch', $body);
    }

    private function send(string $toPhone, string $type, string $body, ?int $stopId = null, ?int $riderId = null): void
    {
        $log = WhatsappLog::create([
            'organization_id' => $this->organization->id,
            'to_phone' => $toPhone,
            'message_type' => $type,
            'message_body' => $body,
            'status' => 'pending',
            'stop_id' => $stopId,
            'rider_id' => $riderId,
        ]);

        try {
            $sid = $this->sendViaTwilio($toPhone, $body);
            $log->update(['status' => 'sent', 'twilio_sid' => $sid, 'sent_at' => now()]);
        } catch (\Exception $e) {
            Log::error('WhatsApp send failed', ['error' => $e->getMessage(), 'to' => $toPhone, 'type' => $type]);
            $log->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
        }
    }

    private function sendViaTwilio(string $toPhone, string $body): string
    {
        if (!$this->organization->whatsapp_token) {
            Log::info('WhatsApp not configured, skipping send to: ' . $toPhone);
            return 'SIMULATED_' . uniqid();
        }

        $client = $this->getTwilioClient();
        $message = $client->messages->create(
            'whatsapp:' . $toPhone,
            [
                'from' => 'whatsapp:' . $this->organization->whatsapp_phone,
                'body' => $body,
            ]
        );

        return $message->sid;
    }

    private function getTwilioClient(): TwilioClient
    {
        if (!$this->twilio) {
            // Parse account SID from token (format: AccountSID:AuthToken)
            [$accountSid, $authToken] = explode(':', $this->organization->whatsapp_token . ':', 2);
            $this->twilio = new TwilioClient($accountSid, $authToken);
        }
        return $this->twilio;
    }
}
