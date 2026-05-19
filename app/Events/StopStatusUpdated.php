<?php

namespace App\Events;

use App\Models\RouteStop;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StopStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly RouteStop $stop,
        public readonly int $organizationId
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("org.{$this->organizationId}.live"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'stop.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'stop_id' => $this->stop->id,
            'route_id' => $this->stop->route_id,
            'status' => $this->stop->status,
            'facility_name' => $this->stop->task?->facility?->name,
            'rider_id' => $this->stop->route?->rider_id,
        ];
    }
}
