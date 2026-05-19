<?php

namespace App\Jobs;

use App\Models\Organization;
use App\Models\Rider;
use App\Models\RouteStop;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        private readonly int $organizationId,
        private readonly string $toPhone,
        private readonly string $messageType,
        private readonly array $data = [],
        private readonly ?int $stopId = null,
        private readonly ?int $riderId = null,
    ) {}

    public function handle(): void
    {
        $org = Organization::find($this->organizationId);
        if (!$org) return;

        $service = new WhatsAppService($org);

        try {
            match ($this->messageType) {
                'dispatch' => $this->sendDispatch($service),
                'on_way' => $this->sendOnWay($service),
                'delivery_confirmation' => $this->sendDeliveryConfirmation($service),
                'failed_alert' => $this->sendFailedAlert($service),
                'dispute_alert' => $this->sendDisputeAlert($service),
                default => Log::warning("Unknown WhatsApp message type: {$this->messageType}"),
            };
        } catch (\Exception $e) {
            Log::error('WhatsApp job failed', ['type' => $this->messageType, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function sendDispatch(WhatsAppService $service): void
    {
        $rider = $this->riderId ? Rider::find($this->riderId) : null;
        if ($rider) {
            $service->sendDispatchNotification($rider, $this->data['stop_count'] ?? 0, $this->data['date'] ?? today()->format('l'));
        }
    }

    private function sendOnWay(WhatsAppService $service): void
    {
        $stop = $this->stopId ? RouteStop::find($this->stopId) : null;
        if ($stop) {
            $service->sendOnTheWayNotification($stop, $this->data['eta'] ?? 'soon');
        }
    }

    private function sendDeliveryConfirmation(WhatsAppService $service): void
    {
        $stop = $this->stopId ? RouteStop::find($this->stopId) : null;
        if ($stop) {
            $service->sendDeliveryConfirmationRequest($stop);
        }
    }

    private function sendFailedAlert(WhatsAppService $service): void
    {
        $stop = $this->stopId ? RouteStop::find($this->stopId) : null;
        if ($stop) {
            $service->sendFailedPickupAlert($stop, $this->data['reason'] ?? 'Unknown reason');
        }
    }

    private function sendDisputeAlert(WhatsAppService $service): void
    {
        $stop = $this->stopId ? RouteStop::find($this->stopId) : null;
        if ($stop) {
            $service->sendDisputeAlert($stop);
        }
    }
}
