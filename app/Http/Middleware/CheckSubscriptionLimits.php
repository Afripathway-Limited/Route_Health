<?php
namespace App\Http\Middleware;

use App\Models\OrganizationSubscription;
use App\Models\Rider;
use App\Models\Facility;
use App\Models\Task;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscriptionLimits
{
    public function handle(Request $request, Closure $next, string $resource): Response
    {
        $user = $request->user();
        $orgId = $user?->organization_id;

        if (!$orgId) return $next($request);

        $org = $user->organization;
        $plan = $org?->subscriptionPlan;

        // No plan = use legacy subscription_plan enum defaults
        if (!$plan) return $next($request);

        $limit = match($resource) {
            'riders' => ['current' => Rider::where('organization_id', $orgId)->where('is_active', true)->count(), 'max' => $plan->max_riders, 'label' => 'riders'],
            'facilities' => ['current' => Facility::where('organization_id', $orgId)->where('is_active', true)->count(), 'max' => $plan->max_facilities, 'label' => 'facilities'],
            'tasks' => ['current' => Task::where('organization_id', $orgId)->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count(), 'max' => $plan->max_tasks_per_month, 'label' => 'tasks this month'],
            default => null,
        };

        if (!$limit || $limit['max'] >= 9999) return $next($request);

        if ($limit['current'] >= $limit['max']) {
            return response()->json([
                'success' => false,
                'message' => "Your {$plan->display_name} plan allows {$limit['max']} {$limit['label']}. You have reached your limit. Please upgrade to add more.",
                'errors' => ['limit' => ["Plan limit reached: {$limit['max']} {$limit['label']}"]],
            ], 402);
        }

        return $next($request);
    }
}
