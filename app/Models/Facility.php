<?php

namespace App\Models;

use App\Models\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facility extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id', 'name', 'address_line_1', 'address_line_2',
        'city', 'country', 'latitude', 'longitude', 'facility_type',
        'contact_name', 'contact_phone', 'special_notes', 'is_active',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'is_active' => 'boolean',
    ];

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function riders(): HasMany
    {
        return $this->hasMany(Rider::class, 'home_facility_id');
    }

    public function etaAdjustments(): HasMany
    {
        return $this->hasMany(FacilityEtaAdjustment::class);
    }

    public function getPickupsThisMonthCountAttribute(): int
    {
        return $this->tasks()
            ->where('type', 'pickup')
            ->whereMonth('scheduled_date', now()->month)
            ->whereYear('scheduled_date', now()->year)
            ->count();
    }

    public function getFacilityTypeIconAttribute(): string
    {
        return match($this->facility_type) {
            'lab' => '🧪',
            'hospital' => '🏥',
            'pharmacy' => '💊',
            default => '🏥',
        };
    }
}
