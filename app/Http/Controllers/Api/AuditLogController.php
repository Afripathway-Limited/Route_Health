<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = AuditLog::with('user')
            ->where('organization_id', $user->organization_id)
            ->orderByDesc('created_at');

        if ($request->user_id) $query->where('user_id', $request->user_id);
        if ($request->action) $query->where('action', 'like', $request->action . '%');
        if ($request->entity_type) $query->where('entity_type', $request->entity_type);
        if ($request->from) $query->whereDate('created_at', '>=', $request->from);
        if ($request->to) $query->whereDate('created_at', '<=', $request->to);

        $logs = $query->paginate(50);
        return $this->paginated($logs);
    }
}
