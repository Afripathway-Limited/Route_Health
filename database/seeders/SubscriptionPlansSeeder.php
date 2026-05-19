<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlansSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'starter',
                'display_name' => 'Starter',
                'price_usd_monthly' => 49.00,
                'price_usd_annual' => 470.00,
                'max_riders' => 10,
                'max_facilities' => 20,
                'max_tasks_per_month' => 500,
                'max_dispatchers' => 2,
                'features' => ['WhatsApp Integration', 'Live Tracking', 'Chain of Custody', 'Basic Analytics'],
                'is_active' => true,
                'is_public' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'professional',
                'display_name' => 'Professional',
                'price_usd_monthly' => 149.00,
                'price_usd_annual' => 1430.00,
                'max_riders' => 20,
                'max_facilities' => 60,
                'max_tasks_per_month' => 2000,
                'max_dispatchers' => 5,
                'features' => ['WhatsApp Integration', 'Live Tracking', 'Chain of Custody', 'Advanced Analytics', 'AI Insights', 'PDF Export', 'CSV Export', 'SLA Reports'],
                'is_active' => true,
                'is_public' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'enterprise',
                'display_name' => 'Enterprise',
                'price_usd_monthly' => 399.00,
                'price_usd_annual' => 3830.00,
                'max_riders' => 9999,
                'max_facilities' => 9999,
                'max_tasks_per_month' => 999999,
                'max_dispatchers' => 999,
                'features' => ['WhatsApp Integration', 'Live Tracking', 'Chain of Custody', 'Advanced Analytics', 'AI Insights', 'PDF Export', 'CSV Export', 'SLA Reports', 'Audit Log', 'Custom Branding', 'API Access', 'Dedicated Support'],
                'is_active' => true,
                'is_public' => true,
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(['name' => $plan['name']], $plan);
        }
    }
}
