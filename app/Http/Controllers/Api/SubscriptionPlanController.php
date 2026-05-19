<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Models\OrganizationSubscription;
use App\Models\Invoice;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionPlanController extends Controller
{
    public function index(): JsonResponse
    {
        return $this->success(SubscriptionPlan::orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|unique:subscription_plans',
            'display_name' => 'required|string',
            'price_usd_monthly' => 'required|numeric|min:0',
            'price_usd_annual' => 'required|numeric|min:0',
            'max_riders' => 'required|integer|min:1',
            'max_facilities' => 'required|integer|min:1',
            'max_tasks_per_month' => 'required|integer|min:1',
            'max_dispatchers' => 'required|integer|min:1',
            'features' => 'nullable|array',
            'is_active' => 'boolean',
            'is_public' => 'boolean',
            'sort_order' => 'integer',
        ]);
        return $this->success(SubscriptionPlan::create($data), 'Plan created', 201);
    }

    public function show(SubscriptionPlan $plan): JsonResponse
    {
        return $this->success($plan->load('subscriptions.organization'));
    }

    public function update(Request $request, SubscriptionPlan $plan): JsonResponse
    {
        $data = $request->validate([
            'display_name' => 'string',
            'price_usd_monthly' => 'numeric|min:0',
            'price_usd_annual' => 'numeric|min:0',
            'max_riders' => 'integer|min:1',
            'max_facilities' => 'integer|min:1',
            'max_tasks_per_month' => 'integer|min:1',
            'max_dispatchers' => 'integer|min:1',
            'features' => 'nullable|array',
            'is_active' => 'boolean',
            'is_public' => 'boolean',
            'sort_order' => 'integer',
        ]);
        $plan->update($data);
        return $this->success($plan, 'Plan updated');
    }

    public function destroy(SubscriptionPlan $plan): JsonResponse
    {
        if ($plan->subscriptions()->whereIn('status', ['active', 'trialing'])->exists()) {
            return $this->error('Cannot delete a plan with active subscriptions', 422);
        }
        $plan->delete();
        return $this->success(null, 'Plan deleted');
    }

    // Revenue dashboard
    public function revenue(Request $request): JsonResponse
    {
        $subscriptions = OrganizationSubscription::with(['plan', 'organization', 'invoices'])
            ->whereIn('status', ['active', 'trialing'])
            ->get();

        $mrr = $subscriptions->sum(fn($s) =>
            $s->billing_cycle === 'annual'
                ? ($s->plan->price_usd_annual / 12)
                : $s->plan->price_usd_monthly
        );

        // MRR last 12 months (simplified from invoices)
        $mrrHistory = collect(range(11, 0))->map(function ($monthsAgo) {
            $date = now()->subMonths($monthsAgo);
            $amount = Invoice::whereYear('paid_at', $date->year)
                ->whereMonth('paid_at', $date->month)
                ->where('status', 'paid')
                ->sum('amount_usd');
            return ['month' => $date->format('M Y'), 'mrr' => round($amount, 2)];
        })->values();

        $orgsWithSubs = Organization::with(['activeSubscription.plan'])
            ->whereHas('activeSubscription')
            ->get()
            ->map(fn($org) => [
                'id' => $org->id,
                'name' => $org->name,
                'plan' => $org->activeSubscription?->plan?->display_name,
                'monthly_value' => $org->activeSubscription?->billing_cycle === 'annual'
                    ? round(($org->activeSubscription->plan->price_usd_annual / 12), 2)
                    : $org->activeSubscription?->plan?->price_usd_monthly,
                'status' => $org->activeSubscription?->status,
                'next_billing' => $org->activeSubscription?->current_period_end?->format('Y-m-d'),
                'billing_cycle' => $org->activeSubscription?->billing_cycle,
            ]);

        return $this->success([
            'mrr' => round($mrr, 2),
            'arr' => round($mrr * 12, 2),
            'active_paying_orgs' => $subscriptions->where('status', 'active')->count(),
            'mrr_history' => $mrrHistory,
            'organizations' => $orgsWithSubs,
        ]);
    }

    // Assign / change plan for an org
    public function assignPlan(Request $request, Organization $organization): JsonResponse
    {
        $data = $request->validate([
            'plan_id' => 'required|exists:subscription_plans,id',
            'billing_cycle' => 'required|in:monthly,annual',
            'status' => 'in:active,trialing,cancelled',
        ]);

        $plan = SubscriptionPlan::findOrFail($data['plan_id']);
        $now = now();

        $sub = OrganizationSubscription::updateOrCreate(
            ['organization_id' => $organization->id],
            [
                'plan_id' => $plan->id,
                'status' => $data['status'] ?? 'active',
                'billing_cycle' => $data['billing_cycle'],
                'current_period_start' => $now,
                'current_period_end' => $data['billing_cycle'] === 'annual'
                    ? $now->copy()->addYear()
                    : $now->copy()->addMonth(),
            ]
        );

        $organization->update(['subscription_plan_id' => $plan->id]);

        return $this->success($sub->load('plan'), 'Plan assigned');
    }

    // Org billing history
    public function orgInvoices(Organization $organization): JsonResponse
    {
        $invoices = Invoice::where('organization_id', $organization->id)
            ->latest()
            ->get();
        return $this->success($invoices);
    }
}
