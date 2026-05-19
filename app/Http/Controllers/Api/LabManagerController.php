<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\WhatsappConfirmation;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class LabManagerController extends Controller
{
    public function todayPickups(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $stops = RouteStop::whereHas('route', fn($q) =>
            $q->where('organization_id', $orgId)->whereDate('date', today())
        )
        ->with(['route.rider', 'task.facility', 'custodyPhotos', 'whatsappConfirmation'])
        ->orderBy('planned_arrival')
        ->get();

        $data = $stops->map(fn($stop) => [
            'id' => $stop->id,
            'facility' => $stop->task?->facility ? [
                'id' => $stop->task->facility->id,
                'name' => $stop->task->facility->name,
                'city' => $stop->task->facility->city,
            ] : null,
            'rider' => $stop->route?->rider ? [
                'id' => $stop->route->rider->id,
                'name' => $stop->route->rider->name,
                'photo_url' => $stop->route->rider->photo_url,
                'phone' => $stop->route->rider->phone,
            ] : null,
            'status' => $stop->status,
            'planned_arrival' => $stop->planned_arrival,
            'actual_arrival' => $stop->actual_arrival,
            'task_type' => $stop->task?->type,
            'task_notes' => $stop->task?->notes,
            'has_photos' => $stop->custodyPhotos->isNotEmpty(),
            'can_confirm' => in_array($stop->status, ['delivered', 'collected']),
            'confirmation' => $stop->whatsappConfirmation ? [
                'response' => $stop->whatsappConfirmation->response,
                'received_at' => $stop->whatsappConfirmation->received_at,
            ] : null,
        ]);

        // Counts
        $counts = [
            'expected' => $stops->count(),
            'on_the_way' => $stops->where('status', 'collected')->count(),
            'arrived' => $stops->whereIn('status', ['arrived', 'photo_taken'])->count(),
            'confirmed' => $stops->whereIn('status', ['confirmed_delivered'])->count(),
            'disputed' => $stops->where('status', 'disputed')->count(),
        ];

        return $this->success(['counts' => $counts, 'pickups' => $data]);
    }

    public function pickupHistory(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = RouteStop::whereHas('route', fn($q) =>
            $q->where('organization_id', $orgId)
        )
        ->with(['route.rider', 'task.facility', 'custodyPhotos', 'whatsappConfirmation']);

        if ($request->from) {
            $query->whereHas('route', fn($q) => $q->whereDate('date', '>=', $request->from));
        }
        if ($request->to) {
            $query->whereHas('route', fn($q) => $q->whereDate('date', '<=', $request->to));
        }
        if ($request->status) {
            $query->where('status', $request->status);
        }

        $stops = $query->latest('planned_arrival')->paginate(30);

        $data = $stops->map(fn($stop) => [
            'id' => $stop->id,
            'date' => $stop->planned_arrival?->format('Y-m-d'),
            'time' => $stop->actual_arrival?->format('g:i A') ?? $stop->planned_arrival?->format('g:i A'),
            'facility_name' => $stop->task?->facility?->name,
            'rider_name' => $stop->route?->rider?->name,
            'rider_photo' => $stop->route?->rider?->photo_url,
            'task_notes' => $stop->task?->notes,
            'status' => $stop->status,
            'has_photos' => $stop->custodyPhotos->isNotEmpty(),
            'confirmation' => $stop->whatsappConfirmation ? [
                'response' => $stop->whatsappConfirmation->response,
                'received_at' => $stop->whatsappConfirmation->received_at,
            ] : null,
        ]);

        return $this->paginated($stops->setCollection($data));
    }

    public function confirm(Request $request, RouteStop $routeStop): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        // Ensure this stop belongs to the organization
        if ($routeStop->route?->organization_id !== $orgId) {
            return $this->error('Access denied', 403);
        }

        $request->validate(['response' => 'required|in:yes,no']);

        DB::transaction(function () use ($request, $routeStop, $orgId) {
            WhatsappConfirmation::create([
                'route_stop_id' => $routeStop->id,
                'organization_id' => $orgId,
                'from_phone' => $request->user()->phone ?? 'portal',
                'response' => $request->response,
                'raw_message' => 'Confirmed via portal by ' . $request->user()->name,
                'received_at' => now(),
                'processed_at' => now(),
            ]);

            $newStatus = $request->response === 'yes' ? 'confirmed_delivered' : 'disputed';
            $routeStop->update(['status' => $newStatus]);

            // Fire Pusher event
            try {
                event(new \App\Events\StopStatusUpdated($routeStop, $orgId));
            } catch (\Exception) {}
        });

        return $this->success(null, $request->response === 'yes' ? 'Delivery confirmed' : 'Delivery disputed');
    }

    public function custody(Request $request, RouteStop $routeStop): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        if ($routeStop->route?->organization_id !== $orgId) {
            return $this->error('Access denied', 403);
        }

        $routeStop->load(['custodyPhotos', 'whatsappLogs', 'whatsappConfirmation', 'task.facility', 'route.rider']);

        return $this->success([
            'stop_id' => $routeStop->id,
            'facility' => $routeStop->task?->facility?->name,
            'rider' => $routeStop->route?->rider?->name,
            'pickup_photo' => $routeStop->pickupPhoto,
            'delivery_photo' => $routeStop->deliveryPhoto,
            'whatsapp_sent_at' => $routeStop->whatsapp_sent_at,
            'whatsapp_confirmation' => $routeStop->whatsappConfirmation,
        ]);
    }

    public function custodyPdf(Request $request, RouteStop $routeStop): Response
    {
        $orgId = $request->user()->organization_id;

        if ($routeStop->route?->organization_id !== $orgId) {
            abort(403, 'Access denied');
        }

        $routeStop->load(['custodyPhotos', 'whatsappConfirmation', 'task.facility', 'route.rider', 'route.organization']);

        $pickupPhoto = $routeStop->custodyPhotos->where('photo_type', 'pickup')->first();
        $deliveryPhoto = $routeStop->custodyPhotos->where('photo_type', 'delivery')->first();

        $pdf = Pdf::loadView('pdf.chain-of-custody', [
            'stop_id' => $routeStop->id,
            'organization' => $routeStop->route?->organization?->name ?? 'RouteHealth',
            'facility' => $routeStop->task?->facility?->name,
            'rider' => $routeStop->route?->rider?->name,
            'status' => $routeStop->status,
            'planned_arrival' => $routeStop->planned_arrival,
            'actual_arrival' => $routeStop->actual_arrival,
            'route_date' => $routeStop->route?->date?->format('d M Y'),
            'pickup_photo' => $pickupPhoto ? $pickupPhoto->toArray() : null,
            'delivery_photo' => $deliveryPhoto ? $deliveryPhoto->toArray() : null,
            'whatsapp_confirmation' => $routeStop->whatsappConfirmation?->toArray(),
        ])->setPaper('a4');

        return $pdf->download("chain-of-custody-stop-{$routeStop->id}.pdf");
    }
}
