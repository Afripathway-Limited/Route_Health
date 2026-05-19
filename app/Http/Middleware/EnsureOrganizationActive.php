<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && !$user->isSuperAdmin()) {
            if (!$user->organization || $user->organization->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Your organization account has been suspended.',
                    'errors' => [],
                ], 403);
            }
        }

        return $next($request);
    }
}
