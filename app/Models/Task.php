<?php

namespace App\Models;

use App\Models\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Task extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'facility_id', 'type', 'scheduled_date',
        'time_window_start', 'time_window_end', 'priority', 'status',
        'route_id', 'notes', 'created_by', 'rider_id',
        'pickup_name', 'pickup_lat', 'pickup_lng',
        'dropoff_name', 'dropoff_lat', 'dropoff_lng',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function routeStop(): HasOne
    {
        return $this->hasOne(RouteStop::class);
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    public function scopeForDate($query, string $date)
    {
        return $query->where('scheduled_date', $date);
    }

    public function scopeUnassigned($query)
    {
        return $query->whereNull('route_id')->where('status', 'planned');
    }

    public function getTimeWindowDisplayAttribute(): string
    {
        return date('g:i A', strtotime($this->time_window_start))
            . ' – '
            . date('g:i A', strtotime($this->time_window_end));
    }
}
