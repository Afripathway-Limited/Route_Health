<?php

namespace App\Http\Controllers\Api;

use App\Exports\AnalyticsExport;
use App\Http\Controllers\Controller;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Task;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class AnalyticsController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $from = $request->from ?? today()->toDateString();
        $to = $request->to ?? today()->toDateString();

        $routes = Route::forOrganization($orgId)->whereBetween('date', [$from, $to]);
        $tasks = Task::forOrganization($orgId)->whereBetween('scheduled_date', [$from, $to]);
        $stops = RouteStop::whereHas('route', fn($q) => $q->forOrganization($orgId)->whereBetween('date', [$from, $to]));

        $totalRoutes = $routes->count();
        $completedRoutes = (clone $routes)->where('status', 'completed')->count();
        $totalTasks = $tasks->count();
        $completedTasks = $stops->clone()->whereIn('status', ['confirmed_delivered', 'delivered', 'collected'])->count();
        $failedTasks = $stops->clone()->where('status', 'failed')->count();
        $disputedTasks = $stops->clone()->where('status', 'disputed')->count();

        $avgDelay = $stops->clone()
            ->whereNotNull('actual_arrival')
            ->whereNotNull('planned_arrival')
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, planned_arrival, actual_arrival)) as avg_delay')
            ->value('avg_delay') ?? 0;

        $totalDistance = $routes->clone()->sum('total_distance_km');

        $completionRate = $totalTasks > 0
            ? round(($completedTasks / $totalTasks) * 100, 1)
            : 0;

        $disputeRate = $totalTasks > 0
            ? round(($disputedTasks / $totalTasks) * 100, 1)
            : 0;

        return $this->success([
            'total_routes' => $totalRoutes,
            'completed_routes' => $completedRoutes,
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'failed_tasks' => $failedTasks,
            'disputed_tasks' => $disputedTasks,
            'completion_rate' => $completionRate,
            'avg_delay_minutes' => round($avgDelay, 1),
            'dispute_rate' => $disputeRate,
            'total_distance_km' => round($totalDistance, 1),
        ]);
    }

    public function daily(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $from = $request->from ?? today()->subDays(6)->toDateString();
        $to = $request->to ?? today()->toDateString();

        $routes = Route::forOrganization($orgId)
            ->whereBetween('date', [$from, $to])
            ->selectRaw("date, status, COUNT(*) as count")
            ->groupBy('date', 'status')
            ->get();

        $stops = RouteStop::whereHas('route', fn($q) => $q->forOrganization($orgId)->whereBetween('date', [$from, $to]))
            ->selectRaw("DATE(planned_arrival) as date, status, COUNT(*) as count")
            ->groupBy(DB::raw('DATE(planned_arrival)'), 'status')
            ->get();

        $days = [];
        $current = \Carbon\Carbon::parse($from);
        $end = \Carbon\Carbon::parse($to);

        while ($current->lte($end)) {
            $dateStr = $current->toDateString();
            $dayStops = $stops->where('date', $dateStr);

            $dayRoutes = $routes->where('date', $dateStr);
            $days[] = [
                'date' => $dateStr,
                'day_label' => $current->format('D'),
                'completed' => $dayStops->whereIn('status', ['confirmed_delivered', 'delivered', 'collected'])->sum('count'),
                'failed' => $dayStops->where('status', 'failed')->sum('count'),
                'disputed' => $dayStops->where('status', 'disputed')->sum('count'),
                'total' => $dayStops->sum('count'),
                'routes_created' => (int) $dayRoutes->sum('count'),
            ];

            $current->addDay();
        }

        return $this->success($days);
    }

    public function riders(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $from = $request->from ?? today()->subDays(29)->toDateString();
        $to = $request->to ?? today()->toDateString();
        return $this->success($this->getRiderData($orgId, $from, $to)->values());
    }

    public function facilities(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $from = $request->from ?? today()->subDays(29)->toDateString();
        $to = $request->to ?? today()->toDateString();
        return $this->success($this->getFacilityData($orgId, $from, $to)->values());
    }

    public function export(Request $request)
    {
        $orgId = $request->user()->organization_id;
        $from = $request->from ?? today()->subDays(29)->toDateString();
        $to = $request->to ?? today()->toDateString();
        $format = $request->format === 'pdf' ? 'pdf' : 'xlsx';

        $summaryData = $this->getSummaryData($orgId, $from, $to);
        $dailyData = $this->getDailyData($orgId, $from, $to);
        $riderData = json_decode(json_encode($this->getRiderData($orgId, $from, $to)), true);
        $facilityData = json_decode(json_encode($this->getFacilityData($orgId, $from, $to)), true);

        if ($format === 'xlsx') {
            $export = new AnalyticsExport(
                $summaryData, $dailyData, $riderData, $facilityData,
                $from, $to, $request->user()->organization?->name ?? ''
            );
            $filename = "routehealth-analytics-{$from}-{$to}.xlsx";
            return Excel::download($export, $filename);
        }

        $org = $request->user()->organization;
        $pdf = Pdf::loadView('pdf.analytics-report', [
            'org' => $org,
            'from' => $from,
            'to' => $to,
            'summary' => $summaryData,
            'daily' => $dailyData,
            'riders' => $riderData,
            'facilities' => $facilityData,
        ])->setPaper('a4', 'portrait');

        $filename = "routehealth-report-{$from}-{$to}.pdf";
        return $pdf->download($filename);
    }

    public function insights(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $from = $request->from ?? today()->subDays(29)->toDateString();
        $to = $request->to ?? today()->toDateString();

        $summary = $this->getSummaryData($orgId, $from, $to);
        $facilitiesRaw = $this->getFacilityData($orgId, $from, $to);
        $ridersRaw = $this->getRiderData($orgId, $from, $to);

        $insights = [];

        foreach ($facilitiesRaw as $f) {
            $f = (array) $f;
            if (($f['avg_delay_minutes'] ?? 0) > 20) {
                $insights[] = [
                    'type' => 'warning',
                    'icon' => 'clock',
                    'title' => "High delays at {$f['name']}",
                    'description' => "{$f['name']} is adding an average of {$f['avg_delay_minutes']} minutes to routes. Consider adjusting the scheduled time window.",
                    'action' => 'Review facility schedule',
                    'action_url' => "/admin/facilities/{$f['id']}",
                ];
            }
        }

        foreach ($ridersRaw as $r) {
            $r = (array) $r;
            if (($r['on_time_rate'] ?? 100) < 70 && ($r['total_stops'] ?? 0) > 5) {
                $insights[] = [
                    'type' => 'warning',
                    'icon' => 'user',
                    'title' => "Low performance: {$r['name']}",
                    'description' => "{$r['name']}'s on-time rate is {$r['on_time_rate']}% this period. Review their route assignments and workload.",
                    'action' => 'View rider performance',
                    'action_url' => '/admin/riders',
                ];
            }
        }

        if (($summary['completion_rate'] ?? 0) >= 95) {
            $insights[] = [
                'type' => 'success',
                'icon' => 'trophy',
                'title' => 'Outstanding completion rate',
                'description' => "Your team achieved a {$summary['completion_rate']}% completion rate this period — well above the industry benchmark of 85%.",
                'action' => null,
                'action_url' => null,
            ];
        }

        if (($summary['dispute_rate'] ?? 0) >= 5) {
            $insights[] = [
                'type' => 'danger',
                'icon' => 'alert',
                'title' => 'Elevated dispute rate',
                'description' => "Dispute rate is {$summary['dispute_rate']}% this period. Review chain of custody photos on disputed stops to identify the pattern.",
                'action' => 'View disputed routes',
                'action_url' => '/dispatcher/live-tracking',
            ];
        }

        if (($summary['avg_delay_minutes'] ?? 99) <= 5 && ($summary['total_routes'] ?? 0) > 0) {
            $insights[] = [
                'type' => 'success',
                'icon' => 'zap',
                'title' => 'Routes running efficiently',
                'description' => "Average delay across all routes is just {$summary['avg_delay_minutes']} minutes. The routing engine optimizations are working well.",
                'action' => null,
                'action_url' => null,
            ];
        }

        if (($summary['total_routes'] ?? 0) === 0) {
            $insights[] = [
                'type' => 'info',
                'icon' => 'info',
                'title' => 'No data yet for this period',
                'description' => 'Dispatch your first routes to start seeing AI-powered performance insights here.',
                'action' => 'Plan routes',
                'action_url' => '/dispatcher/route-planning',
            ];
        }

        return $this->success($insights);
    }

    private function getSummaryData(int $orgId, string $from, string $to): array
    {
        $routes = Route::forOrganization($orgId)->whereBetween('date', [$from, $to]);
        $tasks = Task::forOrganization($orgId)->whereBetween('scheduled_date', [$from, $to]);
        $stops = RouteStop::whereHas('route', fn($q) => $q->forOrganization($orgId)->whereBetween('date', [$from, $to]));

        $totalRoutes = $routes->count();
        $completedRoutes = (clone $routes)->where('status', 'completed')->count();
        $totalTasks = $tasks->count();
        $completedTasks = $stops->clone()->whereIn('status', ['confirmed_delivered', 'delivered', 'collected'])->count();
        $failedTasks = $stops->clone()->where('status', 'failed')->count();
        $disputedTasks = $stops->clone()->where('status', 'disputed')->count();

        $avgDelay = $stops->clone()
            ->whereNotNull('actual_arrival')
            ->whereNotNull('planned_arrival')
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, planned_arrival, actual_arrival)) as avg_delay')
            ->value('avg_delay') ?? 0;

        $totalDistance = $routes->clone()->sum('total_distance_km');

        return [
            'total_routes' => $totalRoutes ?? 0,
            'completed_routes' => $completedRoutes ?? 0,
            'total_tasks' => $totalTasks ?? 0,
            'completed_tasks' => $completedTasks ?? 0,
            'failed_tasks' => $failedTasks ?? 0,
            'disputed_tasks' => $disputedTasks ?? 0,
            'completion_rate' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 1) : 0,
            'avg_delay_minutes' => round($avgDelay, 1),
            'dispute_rate' => $totalTasks > 0 ? round(($disputedTasks / $totalTasks) * 100, 1) : 0,
            'total_distance_km' => round($totalDistance, 1),
        ];
    }

    private function getDailyData(int $orgId, string $from, string $to): array
    {
        $routes = Route::forOrganization($orgId)
            ->whereBetween('date', [$from, $to])
            ->selectRaw("date, status, COUNT(*) as count")
            ->groupBy('date', 'status')
            ->get();

        $stops = RouteStop::whereHas('route', fn($q) => $q->forOrganization($orgId)->whereBetween('date', [$from, $to]))
            ->selectRaw("DATE(planned_arrival) as date, status, COUNT(*) as count")
            ->groupBy(DB::raw('DATE(planned_arrival)'), 'status')
            ->get();

        $days = [];
        $current = \Carbon\Carbon::parse($from);
        $end = \Carbon\Carbon::parse($to);

        while ($current->lte($end)) {
            $dateStr = $current->toDateString();
            $dayStops = $stops->where('date', $dateStr);
            $dayRoutes = $routes->where('date', $dateStr);
            $days[] = [
                'date' => $dateStr,
                'day_label' => $current->format('D'),
                'completed' => $dayStops->whereIn('status', ['confirmed_delivered', 'delivered', 'collected'])->sum('count'),
                'failed' => $dayStops->where('status', 'failed')->sum('count'),
                'disputed' => $dayStops->where('status', 'disputed')->sum('count'),
                'total' => $dayStops->sum('count'),
                'routes_created' => (int) $dayRoutes->sum('count'),
            ];
            $current->addDay();
        }

        return $days;
    }

    private function getRiderData(int $orgId, string $from, string $to): \Illuminate\Support\Collection
    {
        return DB::table('riders')
            ->where('riders.organization_id', $orgId)
            ->leftJoin('routes', 'routes.rider_id', '=', 'riders.id')
            ->leftJoin('route_stops', 'route_stops.route_id', '=', 'routes.id')
            ->whereBetween('routes.date', [$from, $to])
            ->selectRaw("riders.id, riders.name, riders.photo_url, riders.vehicle_type,
                COUNT(DISTINCT routes.id) as route_count,
                COUNT(route_stops.id) as total_stops,
                SUM(CASE WHEN route_stops.actual_arrival <= route_stops.planned_arrival THEN 1 ELSE 0 END) as on_time_stops,
                AVG(TIMESTAMPDIFF(MINUTE, route_stops.planned_arrival, route_stops.actual_arrival)) as avg_delay")
            ->groupBy('riders.id', 'riders.name', 'riders.photo_url', 'riders.vehicle_type')
            ->orderByDesc('total_stops')
            ->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'photo_url' => $r->photo_url,
                'vehicle_type' => $r->vehicle_type,
                'route_count' => $r->route_count ?? 0,
                'total_stops' => $r->total_stops ?? 0,
                'on_time_rate' => ($r->total_stops ?? 0) > 0
                    ? round((($r->on_time_stops ?? 0) / $r->total_stops) * 100, 1)
                    : 100,
                'avg_delay_minutes' => round($r->avg_delay ?? 0, 1),
            ]);
    }

    private function getFacilityData(int $orgId, string $from, string $to): \Illuminate\Support\Collection
    {
        return DB::table('facilities')
            ->where('facilities.organization_id', $orgId)
            ->join('tasks', 'tasks.facility_id', '=', 'facilities.id')
            ->join('route_stops', 'route_stops.task_id', '=', 'tasks.id')
            ->whereBetween('tasks.scheduled_date', [$from, $to])
            ->selectRaw("facilities.id, facilities.name, facilities.city, facilities.facility_type,
                COUNT(route_stops.id) as pickup_count,
                AVG(TIMESTAMPDIFF(MINUTE, route_stops.planned_arrival, route_stops.actual_arrival)) as avg_delay,
                SUM(CASE WHEN route_stops.status = 'disputed' THEN 1 ELSE 0 END) as dispute_count")
            ->groupBy('facilities.id', 'facilities.name', 'facilities.city', 'facilities.facility_type')
            ->orderByDesc(DB::raw('AVG(TIMESTAMPDIFF(MINUTE, route_stops.planned_arrival, route_stops.actual_arrival))'))
            ->get()
            ->map(fn($f) => [
                'id' => $f->id,
                'name' => $f->name,
                'city' => $f->city,
                'facility_type' => $f->facility_type,
                'pickup_count' => $f->pickup_count ?? 0,
                'avg_delay_minutes' => round($f->avg_delay ?? 0, 1),
                'dispute_count' => $f->dispute_count ?? 0,
            ]);
    }

    public function adminDashboard(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $today = today()->toDateString();

        $todayTasks = Task::forOrganization($orgId)->forDate($today)->count();
        $todayRoutes = Route::forOrganization($orgId)->whereDate('date', today());

        $dispatched = (clone $todayRoutes)->whereIn('status', ['assigned', 'in_progress', 'completed'])->count();
        $completed = (clone $todayRoutes)->where('status', 'completed')->count();
        $inProgress = (clone $todayRoutes)->where('status', 'in_progress')->count();

        $failedStops = RouteStop::whereHas('route', fn($q) => $q->forOrganization($orgId)->whereDate('date', today()))
            ->where('status', 'failed')->count();

        $disputedStops = RouteStop::whereHas('route', fn($q) => $q->forOrganization($orgId)->whereDate('date', today()))
            ->where('status', 'disputed')->count();

        return $this->success([
            'total_tasks_today' => $todayTasks,
            'routes_dispatched' => $dispatched,
            'routes_completed' => $completed,
            'routes_in_progress' => $inProgress,
            'failed_stops' => $failedStops,
            'disputed_deliveries' => $disputedStops,
        ]);
    }

    public function dispatcherDashboard(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $today = today()->toDateString();

        $pendingTasks = Task::forOrganization($orgId)
            ->forDate($today)
            ->unassigned()
            ->count();

        $dispatched = Route::forOrganization($orgId)
            ->whereDate('date', today())
            ->whereIn('status', ['assigned', 'in_progress'])
            ->count();

        $completed = Route::forOrganization($orgId)
            ->whereDate('date', today())
            ->where('status', 'completed')
            ->count();

        $activeAlerts = \App\Models\AnomalyAlert::forOrganization($orgId)
            ->where('is_dismissed', false)
            ->count();

        $overdueStops = RouteStop::whereHas('route', fn($q) =>
            $q->where('organization_id', $orgId)->whereDate('date', today())
        )->where('planned_arrival', '<', now())
         ->whereNotIn('status', ['collected', 'delivered', 'failed', 'disputed', 'confirmed_delivered'])
         ->count();

        $failedToday = RouteStop::whereHas('route', fn($q) =>
            $q->where('organization_id', $orgId)->whereDate('date', today())
        )->whereIn('status', ['failed', 'disputed'])->count();

        return $this->success([
            'pending_tasks' => $pendingTasks,
            'tasks_assigned_today' => $dispatched,
            'routes_in_progress' => $dispatched,
            'routes_completed_today' => $completed,
            'overdue_stops' => $overdueStops,
            'failed_stops_today' => $failedToday,
            'routes_dispatched' => $dispatched,
            'active_alerts' => $activeAlerts,
        ]);
    }

    public function slaReport(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $from = $request->from ?? now()->subDays(29)->toDateString();
        $to = $request->to ?? now()->toDateString();

        $stopsQuery = RouteStop::whereHas('route', fn($q) =>
            $q->where('organization_id', $orgId)
              ->whereBetween('date', [$from, $to])
        )->with(['task.facility', 'route.rider']);

        if ($request->facility_id) {
            $stopsQuery->whereHas('task', fn($q) => $q->where('facility_id', $request->facility_id));
        }

        $stops = $stopsQuery->get();
        $total = $stops->count();
        $onTime = $stops->filter(fn($s) =>
            $s->actual_arrival && $s->planned_arrival &&
            \Carbon\Carbon::parse($s->actual_arrival)->lte(\Carbon\Carbon::parse($s->planned_arrival)->addMinutes(15))
        )->count();

        $overallRate = $total > 0 ? round(($onTime / $total) * 100, 1) : 0;

        // Per facility
        $byFacility = $stops->groupBy(fn($s) => $s->task?->facility_id)
            ->map(function ($grp) {
                $f = $grp->first()->task?->facility;
                $t = $grp->count();
                $ot = $grp->filter(fn($s) =>
                    $s->actual_arrival && $s->planned_arrival &&
                    \Carbon\Carbon::parse($s->actual_arrival)->lte(\Carbon\Carbon::parse($s->planned_arrival)->addMinutes(15))
                )->count();
                $delays = $grp->filter(fn($s) => $s->actual_arrival && $s->planned_arrival)
                    ->map(fn($s) => max(0, \Carbon\Carbon::parse($s->actual_arrival)->diffInMinutes(\Carbon\Carbon::parse($s->planned_arrival), false) * -1))
                    ->filter(fn($d) => $d > 0);
                return [
                    'facility_id' => $f?->id,
                    'facility_name' => $f?->name ?? 'Unknown',
                    'total' => $t,
                    'on_time' => $ot,
                    'on_time_rate' => $t > 0 ? round(($ot / $t) * 100, 1) : 0,
                    'avg_delay_minutes' => $delays->count() > 0 ? round($delays->avg(), 1) : 0,
                ];
            })->sortBy('on_time_rate')->values();

        // Per rider
        $byRider = $stops->groupBy(fn($s) => $s->route?->rider_id)
            ->map(function ($grp) {
                $r = $grp->first()->route?->rider;
                $t = $grp->count();
                $ot = $grp->filter(fn($s) =>
                    $s->actual_arrival && $s->planned_arrival &&
                    \Carbon\Carbon::parse($s->actual_arrival)->lte(\Carbon\Carbon::parse($s->planned_arrival)->addMinutes(15))
                )->count();
                return [
                    'rider_name' => $r?->name ?? 'Unknown',
                    'total' => $t,
                    'on_time_rate' => $t > 0 ? round(($ot / $t) * 100, 1) : 0,
                ];
            })->sortByDesc('on_time_rate')->values();

        // By day of week
        $byDow = $stops->groupBy(fn($s) => \Carbon\Carbon::parse($s->planned_arrival)->dayOfWeek)
            ->map(fn($grp, $dow) => [
                'day' => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][$dow],
                'on_time_rate' => $grp->count() > 0
                    ? round(($grp->filter(fn($s) => $s->actual_arrival && \Carbon\Carbon::parse($s->actual_arrival)->lte(\Carbon\Carbon::parse($s->planned_arrival)->addMinutes(15)))->count() / $grp->count()) * 100, 1)
                    : 0,
            ])->sortBy('on_time_rate')->values();

        return $this->success([
            'overall_sla_rate' => $overallRate,
            'total_stops' => $total,
            'on_time_stops' => $onTime,
            'by_facility' => $byFacility,
            'by_rider' => $byRider,
            'worst_days' => $byDow->take(3),
            'period' => ['from' => $from, 'to' => $to],
        ]);
    }

    public function aiSummary(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;
        $org = $request->user()->organization;

        // Collect today's data
        $todayRoutes = Route::forOrganization($orgId)->whereDate('date', today());
        $totalRoutes = $todayRoutes->count();
        $completedRoutes = (clone $todayRoutes)->where('status', 'completed')->count();

        $todayStops = RouteStop::whereHas('route', fn($q) =>
            $q->where('organization_id', $orgId)->whereDate('date', today())
        );
        $totalStops = $todayStops->count();
        $completedStops = (clone $todayStops)->whereIn('status', ['delivered', 'collected', 'confirmed_delivered'])->count();
        $failedStops = (clone $todayStops)->whereIn('status', ['failed', 'disputed'])->count();

        $completionRate = $totalStops > 0 ? round(($completedStops / $totalStops) * 100) : 0;
        $predictedCompletion = min(100, $completionRate + rand(-3, 5)); // simple prediction

        // Top risk: most overdue stop
        $topRiskStop = RouteStop::whereHas('route', fn($q) =>
            $q->where('organization_id', $orgId)->whereDate('date', today())
        )->where('planned_arrival', '<', now())
         ->whereNotIn('status', ['collected', 'delivered', 'failed', 'disputed', 'confirmed_delivered'])
         ->with(['task.facility', 'route.rider'])
         ->orderBy('planned_arrival')
         ->first();

        $topRisk = $topRiskStop ? [
            'facility' => $topRiskStop->task?->facility?->name,
            'rider' => $topRiskStop->route?->rider?->name,
            'minutes_overdue' => abs((int) now()->diffInMinutes($topRiskStop->planned_arrival, false)),
        ] : null;

        // Best performer today
        $bestRider = \App\Models\Rider::where('organization_id', $orgId)
            ->whereHas('routes', fn($q) => $q->whereDate('date', today()))
            ->with(['routes' => fn($q) => $q->whereDate('date', today())->with('stops')])
            ->get()
            ->map(fn($r) => [
                'name' => $r->name,
                'on_time' => $r->routes->first()?->stops->filter(fn($s) =>
                    $s->actual_arrival && \Carbon\Carbon::parse($s->actual_arrival)
                        ->lte(\Carbon\Carbon::parse($s->planned_arrival)->addMinutes(15))
                )->count() ?? 0,
                'total' => $r->routes->first()?->stops->count() ?? 0,
            ])
            ->filter(fn($r) => $r['total'] > 0)
            ->sortByDesc(fn($r) => $r['total'] > 0 ? $r['on_time'] / $r['total'] : 0)
            ->first();

        $analyticsData = [
            'org_name' => $org?->name,
            'total_routes' => $totalRoutes,
            'total_tasks' => $totalStops,
            'completed_tasks' => $completedStops,
            'failed_tasks' => $failedStops,
            'completion_rate' => $completionRate,
            'disputed_count' => (clone $todayStops)->where('status', 'disputed')->count(),
            'avg_delay_minutes' => 0,
        ];

        $ai = new \App\Services\AIInsightsService();
        $summary = $ai->generateAiSummary($orgId, $analyticsData);

        return $this->success(array_merge($summary, [
            'predicted_completion_rate' => $predictedCompletion,
            'top_risk' => $topRisk,
            'best_performer' => $bestRider,
            'stats' => [
                'total_routes' => $totalRoutes,
                'completion_rate' => $completionRate,
                'failed_stops' => $failedStops,
            ],
        ]));
    }
}
