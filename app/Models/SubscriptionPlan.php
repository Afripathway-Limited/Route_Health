<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'name','display_name','price_usd_monthly','price_usd_annual',
        'max_riders','max_facilities','max_tasks_per_month','max_dispatchers',
        'features','is_active','is_public','sort_order',
    ];
    protected $casts = [
        'features' => 'array',
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'price_usd_monthly' => 'float',
        'price_usd_annual' => 'float',
    ];
    public function subscriptions(): HasMany { return $this->hasMany(OrganizationSubscription::class, 'plan_id'); }
    public function isUnlimited(): bool { return $this->max_riders >= 9999; }
}
