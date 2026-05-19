<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EtaHistory extends Model
{
    public $timestamps = false;

    protected $table = 'eta_history';

    protected $fillable = [
        'route_stop_id', 'facility_id', 'rider_id', 'planned_arrival',
        'actual_arrival', 'delay_minutes', 'day_of_week', 'hour_of_day',
    ];

    protected $casts = [
        'planned_arrival' => 'datetime',
        'actual_arrival' => 'datetime',
    ];

    public function routeStop(): BelongsTo
    {
        return $this->belongsTo(RouteStop::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }
}
