<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PlatformApiConfigController extends Controller
{
    // ── Map key (for client-side Maps JS loader) ──────────────────────────────

    public function mapKey(Request $request): JsonResponse
    {
        $key = env('GOOGLE_MAPS_API_KEY');

        return $this->success([
            'enabled' => !empty($key),
            'key'     => $key ?: null,
        ]);
    }

    // ── Server-side Directions API (road polylines) ───────────────────────────
    // POST /maps/directions
    // Body: { "stops": [[lat, lng], [lat, lng], ...] }
    // Returns: { "points": [[lat, lng], ...] } (decoded overview polyline)

    public function directions(Request $request): JsonResponse
    {
        $key = env('GOOGLE_MAPS_API_KEY');
        if (!$key) {
            return $this->success(['points' => null]);
        }

        $stops = $request->input('stops', []);
        if (count($stops) < 2) {
            return $this->error('At least 2 stops required', 422);
        }

        $origin      = $stops[0];
        $destination = $stops[count($stops) - 1];
        $middle      = array_slice($stops, 1, count($stops) - 2);

        $params = [
            'key'         => $key,
            'origin'      => implode(',', $origin),
            'destination' => implode(',', $destination),
            'mode'        => 'driving',
        ];

        if (!empty($middle)) {
            $params['waypoints'] = implode('|', array_map(fn($w) => implode(',', $w), $middle));
        }

        try {
            $res = Http::timeout(10)->get('https://maps.googleapis.com/maps/api/directions/json', $params);

            if (!$res->ok()) {
                return $this->success(['points' => null]);
            }

            $data = $res->json();

            if (($data['status'] ?? '') !== 'OK' || empty($data['routes'][0]['overview_polyline']['points'])) {
                return $this->success(['points' => null]);
            }

            $points = $this->decodePolyline($data['routes'][0]['overview_polyline']['points']);

            return $this->success(['points' => $points]);
        } catch (\Throwable $e) {
            Log::warning('Directions API error: ' . $e->getMessage());
            return $this->success(['points' => null]);
        }
    }

    // ── Polyline decoder ──────────────────────────────────────────────────────

    private function decodePolyline(string $encoded): array
    {
        $points = [];
        $index  = 0;
        $len    = strlen($encoded);
        $lat    = 0;
        $lng    = 0;

        while ($index < $len) {
            $shift = 0; $result = 0;
            do {
                $b = ord($encoded[$index++]) - 63;
                $result |= ($b & 0x1f) << $shift;
                $shift  += 5;
            } while ($b >= 0x20);
            $lat += ($result & 1) ? ~($result >> 1) : ($result >> 1);

            $shift = 0; $result = 0;
            do {
                $b = ord($encoded[$index++]) - 63;
                $result |= ($b & 0x1f) << $shift;
                $shift  += 5;
            } while ($b >= 0x20);
            $lng += ($result & 1) ? ~($result >> 1) : ($result >> 1);

            $points[] = [$lat / 1e5, $lng / 1e5];
        }

        return $points;
    }
}
