<?php

namespace App\Models;

use App\Models\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Route extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'rider_id', 'date', 'status',
        'depot_latitude', 'depot_longitude', 'planned_start_time',
        'planned_end_time', 'actual_start_time', 'actual_end_time',
        'total_distance_km', 'total_stops', 'optimization_data',
    ];

    protected $casts = [
        'date' => 'date',
        'planned_start_time' => 'datetime',
        'planned_end_time' => 'datetime',
        'actual_start_time' => 'datetime',
        'actual_end_time' => 'datetime',
        'optimization_data' => 'array',
        'total_distance_km' => 'decimal:2',
    ];

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }

    public function stops(): HasMany
    {
        return $this->hasMany(RouteStop::class)->orderBy('sequence');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function anomalyAlerts(): HasMany
    {
        return $this->hasMany(AnomalyAlert::class);
    }

    public function driverLocations(): HasMany
    {
        return $this->hasMany(DriverLocation::class);
    }

    public function getCompletionRateAttribute(): float
    {
        $total = $this->stops()->count();
        if ($total === 0) return 0;

        $completed = $this->stops()
            ->whereIn('status', ['collected', 'delivered', 'confirmed_delivered'])
            ->count();

        return round(($completed / $total) * 100, 1);
    }

    public function getCompletedStopsCountAttribute(): int
    {
        return $this->stops()
            ->whereIn('status', ['collected', 'delivered', 'confirmed_delivered', 'failed', 'disputed'])
            ->count();
    }
}
