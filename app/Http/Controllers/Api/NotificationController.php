<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $notifications = Notification::where('organization_id', $user->organization_id)
            ->where(fn($q) => $q->whereNull('user_id')->orWhere('user_id', $user->id))
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn($n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'message' => $n->message,
                'data' => $n->data,
                'read_at' => $n->read_at?->toISOString(),
                'created_at' => $n->created_at?->toISOString(),
            ]);

        $unread = Notification::where('organization_id', $user->organization_id)
            ->where(fn($q) => $q->whereNull('user_id')->orWhere('user_id', $user->id))
            ->whereNull('read_at')->count();

        return $this->success(['notifications' => $notifications, 'unread_count' => $unread]);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        $user = $request->user();
        if ($notification->organization_id !== $user->organization_id) {
            return $this->error('Access denied', 403);
        }
        $notification->markRead();
        return $this->success(null, 'Marked as read');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();
        Notification::where('organization_id', $user->organization_id)
            ->where(fn($q) => $q->whereNull('user_id')->orWhere('user_id', $user->id))
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
        return $this->success(null, 'All marked as read');
    }
}
