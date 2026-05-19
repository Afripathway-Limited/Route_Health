<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacilityEtaAdjustment extends Model
{
    protected $fillable = [
        'facility_id', 'day_of_week', 'hour_of_day',
        'avg_delay_minutes', 'sample_count', 'computed_at',
    ];

    protected $casts = [
        'avg_delay_minutes' => 'decimal:2',
        'computed_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
