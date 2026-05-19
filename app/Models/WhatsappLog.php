<?php

namespace App\Models;

use App\Models\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappLog extends Model
{
    use BelongsToOrganization;

    protected $table = 'whatsapp_logs';

    protected $fillable = [
        'organization_id', 'to_phone', 'message_type', 'message_body',
        'status', 'stop_id', 'rider_id', 'twilio_sid', 'sent_at', 'error_message',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function routeStop(): BelongsTo
    {
        return $this->belongsTo(RouteStop::class, 'stop_id');
    }

    public function rider(): BelongsTo
    {
        return $this->belongsTo(Rider::class);
    }
}
