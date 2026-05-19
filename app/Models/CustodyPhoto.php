<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustodyPhoto extends Model
{
    protected $fillable = [
        'route_stop_id', 'organization_id', 'photo_type', 'photo_url',
        'thumbnail_url', 's3_key', 'latitude', 'longitude', 'taken_at',
        'uploaded_at', 'device_id', 'is_offline_upload',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'taken_at' => 'datetime',
        'uploaded_at' => 'datetime',
        'is_offline_upload' => 'boolean',
    ];

    public function routeStop(): BelongsTo
    {
        return $this->belongsTo(RouteStop::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
