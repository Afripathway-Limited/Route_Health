<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Cache;

class Organization extends Model
{
    protected $fillable = [
        'name', 'country', 'logo_url', 'primary_color', 'subdomain',
        'whatsapp_phone', 'whatsapp_token', 'whatsapp_provider', 'whatsapp_webhook_url',
        'status', 'subscription_plan', 'subscription_plan_id', 'trial_ends_at',
        'max_riders', 'max_facilities', 'max_tasks_per_month',
        'notification_preferences', 'photo_retention_months',
        'service_city', 'service_lat', 'service_lng', 'service_radius_km',
    ];

    protected $casts = [
        'notification_preferences' => 'array',
        'trial_ends_at' => 'datetime',
    ];

    protected $hidden = ['whatsapp_token'];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function facilities(): HasMany
    {
        return $this->hasMany(Facility::class);
    }

    public function riders(): HasMany
    {
        return $this->hasMany(Rider::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function routes(): HasMany
    {
        return $this->hasMany(Route::class);
    }

    public function anomalyAlerts(): HasMany
    {
        return $this->hasMany(AnomalyAlert::class);
    }

    public function subscriptionPlan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(OrganizationSubscription::class)
            ->whereIn('status', ['active', 'trialing'])
            ->latest();
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(OrganizationSubscription::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function getBrandingAttribute(): array
    {
        return Cache::remember("org_branding_{$this->id}", 3600, fn() => [
            'name' => $this->name,
            'logo_url' => $this->logo_url,
            'primary_color' => $this->primary_color,
            'subdomain' => $this->subdomain,
        ]);
    }

    protected static function booted(): void
    {
        static::saved(function (Organization $org) {
            Cache::forget("org_branding_{$org->id}");
        });
    }
}
