<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\TicketMessage;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    // Org user: list their tickets
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $tickets = SupportTicket::where('organization_id', $user->organization_id)
            ->with(['user', 'messages.user'])
            ->latest()
            ->paginate(20);
        return $this->paginated($tickets);
    }

    // Org user: create ticket
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'required|in:bug,feature_request,billing,general',
            'priority' => 'required|in:low,medium,high,critical',
        ]);

        $ticket = SupportTicket::create([
            ...$data,
            'organization_id' => $user->organization_id,
            'user_id' => $user->id,
        ]);

        return $this->success($ticket, 'Ticket submitted', 201);
    }

    public function show(Request $request, SupportTicket $ticket): JsonResponse
    {
        $user = $request->user();
        if (!$user->hasRole('super_admin') && $ticket->organization_id !== $user->organization_id) {
            return $this->error('Access denied', 403);
        }
        return $this->success($ticket->load(['user', 'messages.user', 'assignedTo']));
    }

    // Super admin: all tickets
    public function adminIndex(Request $request): JsonResponse
    {
        $query = SupportTicket::with(['user', 'organization', 'assignedTo']);

        if ($request->status) $query->where('status', $request->status);
        if ($request->priority) $query->where('priority', $request->priority);
        if ($request->category) $query->where('category', $request->category);
        if ($request->organization_id) $query->where('organization_id', $request->organization_id);

        return $this->paginated($query->latest()->paginate(25));
    }

    // Super admin: update ticket status/assignment
    public function adminUpdate(Request $request, SupportTicket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status' => 'sometimes|in:open,in_progress,resolved,closed',
            'priority' => 'sometimes|in:low,medium,high,critical',
            'assigned_to' => 'sometimes|nullable|exists:users,id',
            'resolution_notes' => 'sometimes|nullable|string',
        ]);

        $oldStatus = $ticket->status;
        $ticket->update($data);

        // Notify ticket creator if status changed meaningfully
        if (isset($data['status']) && $data['status'] !== $oldStatus && in_array($data['status'], ['in_progress', 'resolved'])) {
            NotificationService::create(
                $ticket->organization_id,
                $ticket->user_id,
                'ticket_update',
                "Ticket #{$ticket->id} {$data['status']}",
                "Your support ticket \"{$ticket->title}\" has been marked as {$data['status']}.",
                ['url' => '/support', 'ticket_id' => $ticket->id]
            );
        }

        return $this->success($ticket->fresh(['user', 'assignedTo']));
    }

    // Add message to ticket
    public function addMessage(Request $request, SupportTicket $ticket): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super_admin');

        if (!$isSuperAdmin && $ticket->organization_id !== $user->organization_id) {
            return $this->error('Access denied', 403);
        }

        $data = $request->validate([
            'message' => 'required|string',
            'is_internal' => 'boolean',
        ]);

        $msg = TicketMessage::create([
            'ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'message' => $data['message'],
            'is_internal' => $isSuperAdmin && ($data['is_internal'] ?? false),
        ]);

        return $this->success($msg->load('user'), 'Message added', 201);
    }
}
