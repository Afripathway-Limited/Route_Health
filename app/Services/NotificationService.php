<?php
namespace App\Services;

use App\Models\Notification;
use App\Events\StopStatusUpdated;

class NotificationService
{
    public static function create(
        int $orgId,
        ?int $userId,
        string $type,
        string $title,
        string $message,
        array $data = []
    ): Notification {
        $notif = Notification::create([
            'organization_id' => $orgId,
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
        ]);

        // Broadcast to org channel so Pusher delivers it immediately
        try {
            broadcast(new \App\Events\NewNotification($notif))->toOthers();
        } catch (\Exception) {}

        return $notif;
    }
}
