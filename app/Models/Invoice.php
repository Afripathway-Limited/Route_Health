<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'organization_id','subscription_id','amount_usd','currency','status',
        'payment_gateway','gateway_invoice_id','pdf_url','period_start','period_end','paid_at',
    ];
    protected $casts = [
        'period_start' => 'datetime',
        'period_end' => 'datetime',
        'paid_at' => 'datetime',
        'amount_usd' => 'float',
    ];
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function subscription(): BelongsTo { return $this->belongsTo(OrganizationSubscription::class, 'subscription_id'); }
}
