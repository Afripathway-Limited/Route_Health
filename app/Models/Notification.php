<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    public $timestamps = false;
    protected $fillable = [
        'organization_id','user_id','type','title','message','data','read_at',
    ];
    protected $casts = ['data' => 'array', 'read_at' => 'datetime', 'created_at' => 'datetime'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function markRead(): void { $this->update(['read_at' => now()]); }
    public function isUnread(): bool { return is_null($this->read_at); }
}
