<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class RouteStop extends Model
{
    protected $fillable = [
        'route_id', 'task_id', 'sequence', 'planned_arrival', 'planned_departure',
        'actual_arrival', 'actual_departure', 'status', 'fail_reason', 'fail_notes',
        'whatsapp_sent', 'whatsapp_sent_at',
    ];

    protected $casts = [
        'planned_arrival' => 'datetime',
        'planned_departure' => 'datetime',
        'actual_arrival' => 'datetime',
        'actual_departure' => 'datetime',
        'whatsapp_sent' => 'boolean',
        'whatsapp_sent_at' => 'datetime',
    ];

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function custodyPhotos(): HasMany
    {
        return $this->hasMany(CustodyPhoto::class);
    }

    public function pickupPhoto(): HasOne
    {
        return $this->hasOne(CustodyPhoto::class)->where('photo_type', 'pickup');
    }

    public function deliveryPhoto(): HasOne
    {
        return $this->hasOne(CustodyPhoto::class)->where('photo_type', 'delivery');
    }

    public function whatsappConfirmation(): HasOne
    {
        return $this->hasOne(WhatsappConfirmation::class, 'route_stop_id');
    }

    public function whatsappLogs(): HasMany
    {
        return $this->hasMany(WhatsappLog::class, 'stop_id');
    }

    public function getDelayMinutesAttribute(): ?int
    {
        if (!$this->actual_arrival || !$this->planned_arrival) {
            return null;
        }
        return (int) $this->actual_arrival->diffInMinutes($this->planned_arrival, false);
    }

    public function isOverdue(): bool
    {
        return $this->status === 'pending'
            && $this->planned_arrival->isPast()
            && $this->planned_arrival->diffInMinutes(now()) > 30;
    }
}
