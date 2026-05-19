<?php

namespace App\Events;

use App\Models\AnomalyAlert;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AnomalyDetected implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly AnomalyAlert $alert
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("org.{$this->alert->organization_id}.live"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'anomaly.detected';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->alert->id,
            'alert_type' => $this->alert->alert_type,
            'description' => $this->alert->description,
            'severity' => $this->alert->severity,
            'rider_name' => $this->alert->rider?->name,
            'route_id' => $this->alert->route_id,
            'triggered_at' => $this->alert->triggered_at,
        ];
    }
}
