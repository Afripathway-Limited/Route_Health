<?php

namespace App\Models;

use App\Models\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappConfirmation extends Model
{
    use BelongsToOrganization;

    public $timestamps = false;

    protected $fillable = [
        'route_stop_id', 'organization_id', 'from_phone',
        'response', 'raw_message', 'received_at', 'processed_at',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function routeStop(): BelongsTo
    {
        return $this->belongsTo(RouteStop::class);
    }
}
