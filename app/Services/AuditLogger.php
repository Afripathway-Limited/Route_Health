<?php
namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    public static function log(
        string $action,
        ?object $entity = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null
    ): void {
        try {
            $user = Auth::user();
            $req = $request ?? request();
            AuditLog::create([
                'organization_id' => $user?->organization_id,
                'user_id' => $user?->id,
                'action' => $action,
                'entity_type' => $entity ? class_basename($entity) : null,
                'entity_id' => $entity?->id,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => $req->ip(),
                'user_agent' => substr($req->userAgent() ?? '', 0, 500),
            ]);
        } catch (\Exception) {
            // Never let audit logging break the main flow
        }
    }
}
