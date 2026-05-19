<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrganizationSubscription extends Model
{
    protected $fillable = [
        'organization_id','plan_id','status','billing_cycle',
        'current_period_start','current_period_end','cancel_at_period_end',
        'stripe_subscription_id','paystack_subscription_code','trial_ends_at',
    ];
    protected $casts = [
        'current_period_start' => 'datetime',
        'current_period_end' => 'datetime',
        'trial_ends_at' => 'datetime',
        'cancel_at_period_end' => 'boolean',
    ];
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function plan(): BelongsTo { return $this->belongsTo(SubscriptionPlan::class, 'plan_id'); }
    public function invoices(): HasMany { return $this->hasMany(Invoice::class, 'subscription_id'); }
    public function isActive(): bool { return in_array($this->status, ['active', 'trialing']); }
}
