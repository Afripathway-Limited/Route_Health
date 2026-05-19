<?php

namespace App\Models;

use App\Models\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rider extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'user_id', 'name', 'phone', 'vehicle_type',
        'home_facility_id', 'photo_url', 'notes', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function homeFacility(): BelongsTo
    {
        return $this->belongsTo(Facility::class, 'home_facility_id');
    }

    public function routes(): HasMany
    {
        return $this->hasMany(Route::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(DriverLocation::class);
    }

    public function getTasksThisMonthCountAttribute(): int
    {
        return Route::where('rider_id', $this->id)
            ->whereMonth('date', now()->month)
            ->whereYear('date', now()->year)
            ->withCount('stops')
            ->get()
            ->sum('stops_count');
    }

    public function getOnTimeRateAttribute(): float
    {
        $completed = \App\Models\RouteStop::whereHas('route', fn($q) => $q->where('rider_id', $this->id))
            ->whereNotNull('actual_arrival')
            ->count();

        if ($completed === 0) return 100.0;

        $onTime = \App\Models\RouteStop::whereHas('route', fn($q) => $q->where('rider_id', $this->id))
            ->whereNotNull('actual_arrival')
            ->whereColumn('actual_arrival', '<=', 'planned_arrival')
            ->count();

        return round(($onTime / $completed) * 100, 1);
    }

    public function getLatestLocationAttribute(): ?DriverLocation
    {
        return $this->locations()->latest('recorded_at')->first();
    }
}
