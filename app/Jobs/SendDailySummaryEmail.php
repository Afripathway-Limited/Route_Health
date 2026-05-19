<?php
namespace App\Jobs;

use App\Mail\DailySummaryMail;
use App\Models\Organization;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\AnomalyAlert;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendDailySummaryEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        Organization::where('status', 'active')->each(function (Organization $org) {
            $prefs = $org->notification_preferences ?? [];
            $adminPref = $prefs['admin']['daily_summary']['email'] ?? true;
            if (!$adminPref) return;

            $orgId = $org->id;
            $today = today();

            $stops = RouteStop::whereHas('route', fn($q) =>
                $q->where('organization_id', $orgId)->whereDate('date', $today)
            )->get();

            $total = $stops->count();
            $completed = $stops->whereIn('status', ['delivered', 'collected', 'confirmed_delivered'])->count();
            $failed = $stops->whereIn('status', ['failed'])->count();
            $disputed = $stops->where('status', 'disputed')->count();
            $completionRate = $total > 0 ? round(($completed / $total) * 100) : 0;

            $routes = Route::where('organization_id', $orgId)->whereDate('date', $today)->count();

            $unresolvedAlerts = AnomalyAlert::where('organization_id', $orgId)
                ->where('is_dismissed', false)
                ->where('resolved_at', null)
                ->count();

            $stats = [
                'total_routes' => $routes,
                'total_stops' => $total,
                'completed_stops' => $completed,
                'failed_stops' => $failed,
                'disputed_stops' => $disputed,
                'completion_rate' => $completionRate,
                'unresolved_alerts' => $unresolvedAlerts,
                'date' => $today->format('d M Y'),
            ];

            $admin = $org->users()->role('org_admin')->where('is_active', true)->first();
            if ($admin) {
                Mail::to($admin->email)->queue(new DailySummaryMail($org, $stats));
            }
        });
    }
}
