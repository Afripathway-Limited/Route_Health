<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

abstract class Controller
{
    protected function success(mixed $data, string $message = 'Success', int $status = 200, array $meta = []): JsonResponse
    {
        $response = ['success' => true, 'data' => $data, 'message' => $message];
        if (!empty($meta)) {
            $response['meta'] = $meta;
        }
        return response()->json($response, $status);
    }

    protected function error(string $message, int $status = 400, array $errors = []): JsonResponse
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }

    /**
     * Rewrite a stored logo URL to always use the current server's host and port.
     * Fixes URLs stored when APP_URL was different (e.g. http://localhost vs http://localhost:8000).
     */
    protected function resolveStorageUrl(?string $storedUrl): ?string
    {
        if (!$storedUrl) return null;

        $request = request();

        if (!str_starts_with($storedUrl, 'http')) {
            return $request->getSchemeAndHttpHost() . '/storage/' . ltrim($storedUrl, '/');
        }

        $path = parse_url($storedUrl, PHP_URL_PATH);
        return $request->getSchemeAndHttpHost() . $path;
    }

    protected function paginated(mixed $paginator, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'message' => $message,
            'meta' => [
                'pagination' => [
                    'total' => $paginator->total(),
                    'per_page' => $paginator->perPage(),
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                ],
            ],
        ]);
    }
}
