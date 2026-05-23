<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RouteStop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LabManagerController extends Controller
{
    // ── Helpers ──────────────────────────────────────────────────────────────

    private function formatStop(RouteStop $stop): array
    {
        $rider  = $stop->route?->rider;
        $task   = $stop->task;
        $photos = $stop->custodyPhotos ?? collect();

        return [
            'id'               => $stop->id,
            'sequence'         => $stop->sequence,
            'status'           => $stop->status,
            'can_confirm'      => in_array($stop->status, ['collected', 'delivered']),
            'planned_arrival'  => $stop->planned_arrival,
            'actual_arrival'   => $stop->actual_arrival,
            'fail_reason'      => $stop->fail_reason,
            'fail_notes'       => $stop->fail_notes,
            'has_pickup_photo' => $photos->where('photo_type', 'pickup')->isNotEmpty(),
            'has_delivery_photo' => $photos->where('photo_type', 'delivery')->isNotEmpty(),
            'facility' => $stop->facility ? [
                'id'              => $stop->facility->id,
                'name'            => $stop->facility->name,
                'city'            => $stop->facility->city,
                'address_line_1'  => $stop->facility->address_line_1,
                'contact_name'    => $stop->facility->contact_name,
                'contact_phone'   => $stop->facility->contact_phone,
            ] : null,
            'rider' => $rider ? [
                'id'           => $rider->id,
                'name'         => $rider->name,
                'vehicle_type' => $rider->vehicle_type,
                'phone'        => $rider->phone,
            ] : null,
            'task' => $task ? [
                'id'       => $task->id,
                'type'     => $task->type,
                'priority' => $task->priority,
                'notes'    => $task->notes,
            ] : null,
            'route' => $stop->route ? [
                'id'   => $stop->route->id,
                'date' => $stop->route->date,
            ] : null,
        ];
    }

    // ── Today's pickups ───────────────────────────────────────────────────────

    public function todayPickups(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $stops = RouteStop::whereHas('route', fn($q) =>
                $q->where('organization_id', $orgId)
                  ->whereDate('date', today())
            )
            ->with(['route.rider', 'task', 'facility', 'custodyPhotos'])
            ->whereIn('status', ['pending', 'arrived', 'collected', 'delivered',
                                 'confirmed_delivered', 'failed', 'disputed'])
            ->orderBy('sequence')
            ->get();

        return $this->success($stops->map(fn($s) => $this->formatStop($s))->values());
    }

    // ── History ───────────────────────────────────────────────────────────────

    public function pickupHistory(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $from  = $request->from ?? now()->subDays(6)->toDateString();
        $to    = $request->to   ?? today()->toDateString();

        $query = RouteStop::whereHas('route', fn($q) =>
                $q->where('organization_id', $orgId)
                  ->whereBetween('date', [$from, $to])
            )
            ->with(['route.rider', 'task', 'facility', 'custodyPhotos']);

        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        } else {
            $query->whereIn('status', ['collected', 'delivered', 'confirmed_delivered',
                                       'failed', 'disputed']);
        }

        $stops = $query->orderByDesc(
            \App\Models\Route::select('date')
                ->whereColumn('routes.id', 'route_stops.route_id')
                ->limit(1)
        )->get();

        return $this->success($stops->map(fn($s) => $this->formatStop($s))->values());
    }

    // ── Confirm / Dispute ─────────────────────────────────────────────────────

    public function confirm(Request $request, RouteStop $routeStop): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        // Verify this stop belongs to the org
        abort_unless($routeStop->route?->organization_id === $orgId, 403);
        abort_unless(in_array($routeStop->status, ['collected', 'delivered']), 422,
            'Stop is not in a confirmable state');

        $request->validate([
            'response'     => 'required|in:confirm,dispute',
            'dispute_note' => 'nullable|string|max:500',
        ]);

        if ($request->response === 'confirm') {
            $routeStop->update(['status' => 'confirmed_delivered']);
        } else {
            $routeStop->update([
                'status'     => 'disputed',
                'fail_notes' => $request->dispute_note,
            ]);
        }

        return $this->success(
            $this->formatStop($routeStop->fresh(['route.rider', 'task', 'facility', 'custodyPhotos'])),
            $request->response === 'confirm' ? 'Receipt confirmed' : 'Dispute raised'
        );
    }

    // ── Chain of custody ──────────────────────────────────────────────────────

    public function custody(Request $request, RouteStop $routeStop): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        abort_unless($routeStop->route?->organization_id === $orgId, 403);

        $routeStop->load(['route.rider', 'task', 'facility', 'custodyPhotos']);
        $photos = $routeStop->custodyPhotos ?? collect();

        return $this->success([
            ...$this->formatStop($routeStop),
            'photos' => $photos->map(fn($p) => [
                'id'         => $p->id,
                'type'       => $p->photo_type,
                'url'        => $p->photo_url ?? ($p->photo_path ? asset('storage/' . $p->photo_path) : null),
                'taken_at'   => $p->taken_at,
                'latitude'   => $p->latitude,
                'longitude'  => $p->longitude,
            ])->values(),
        ]);
    }

    // ── Custody PDF ───────────────────────────────────────────────────────────

    public function custodyPdf(Request $request, RouteStop $routeStop): \Symfony\Component\HttpFoundation\Response
    {
        $orgId = $request->user()->organization_id;
        abort_unless($routeStop->route?->organization_id === $orgId, 403);

        $routeStop->load(['route.rider', 'task', 'facility', 'custodyPhotos']);
        $photos = $routeStop->custodyPhotos ?? collect();

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.chain-of-custody', [
            'stop'   => $routeStop,
            'photos' => $photos,
        ]);

        $filename = 'custody-' . $routeStop->id . '-' . now()->format('Ymd') . '.pdf';
        return $pdf->download($filename);
    }
}
