<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformApiConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

class PlatformApiConfigController extends Controller
{
    private array $services = ['openai', 'twilio', 'pusher', 'aws_s3', 'google_maps'];

    public function index(): JsonResponse
    {
        $configs = [];
        foreach ($this->services as $service) {
            $record = PlatformApiConfig::where('service', $service)->first();
            $rawConfig = $record ? $record->config : [];
            $configs[] = [
                'service'       => $service,
                'is_enabled'    => $record?->is_enabled ?? false,
                'test_status'   => $record?->test_status ?? 'untested',
                'last_tested_at'=> $record?->last_tested_at?->toISOString(),
                'config'        => $this->maskSecrets($rawConfig),
            ];
        }
        return $this->success($configs);
    }

    public function update(Request $request, string $service): JsonResponse
    {
        if (!in_array($service, $this->services)) {
            return $this->error('Unknown service', 422);
        }

        $data = $request->validate(['config' => 'required|array', 'is_enabled' => 'boolean']);

        $record = PlatformApiConfig::firstOrNew(['service' => $service]);
        $existingConfig = $record->exists ? $record->config : [];

        // Merge: skip masked placeholders AND empty strings (preserve existing value)
        $newConfig = $existingConfig;
        foreach ($data['config'] as $k => $v) {
            $isMasked = $v === '••••••••';
            $isEmpty  = is_string($v) && trim($v) === '';
            // Only overwrite when the user provided a real new value
            if (!$isMasked && (!$isEmpty || !array_key_exists($k, $existingConfig))) {
                $newConfig[$k] = $v;
            }
        }

        $record->config_data = Crypt::encryptString(json_encode($newConfig));
        $record->is_enabled  = $data['is_enabled'] ?? $record->is_enabled ?? false;
        $record->save();

        return $this->success(null, 'Configuration saved');
    }

    public function test(string $service): JsonResponse
    {
        $record = PlatformApiConfig::where('service', $service)->first();
        if (!$record) return $this->error('Service not configured', 422);

        $config = $record->config;
        $result = match($service) {
            'openai' => $this->testOpenAI($config),
            'twilio' => $this->testTwilio($config),
            'pusher' => $this->testPusher($config),
            'aws_s3' => $this->testS3($config),
            'google_maps' => $this->testGoogleMaps($config),
            default => ['success' => false, 'message' => 'Unknown service'],
        };

        $record->update([
            'last_tested_at' => now(),
            'test_status' => $result['success'] ? 'success' : 'failed',
        ]);

        return response()->json(['success' => $result['success'], 'message' => $result['message']]);
    }

    private function testOpenAI(array $config): array
    {
        try {
            $res = Http::withToken($config['api_key'] ?? '')->post('https://api.openai.com/v1/chat/completions', [
                'model' => $config['model'] ?? 'gpt-3.5-turbo',
                'messages' => [['role' => 'user', 'content' => 'Say OK']],
                'max_tokens' => 5,
            ]);
            return $res->successful()
                ? ['success' => true, 'message' => 'OpenAI connected successfully']
                : ['success' => false, 'message' => $res->json('error.message', 'Connection failed')];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    private function testTwilio(array $config): array
    {
        try {
            $sid = $config['account_sid'] ?? '';
            $token = $config['auth_token'] ?? '';
            $res = Http::withBasicAuth($sid, $token)->get("https://api.twilio.com/2010-04-01/Accounts/{$sid}.json");
            return $res->successful()
                ? ['success' => true, 'message' => 'Twilio account verified']
                : ['success' => false, 'message' => $res->json('message', 'Invalid credentials')];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    private function testPusher(array $config): array
    {
        try {
            $appId = $config['app_id'] ?? '';
            $key = $config['app_key'] ?? '';
            $secret = $config['app_secret'] ?? '';
            $cluster = $config['app_cluster'] ?? 'mt1';
            if (!$appId || !$key || !$secret) return ['success' => false, 'message' => 'Missing Pusher credentials'];
            // Verify by hitting the channels API
            $path = "/apps/{$appId}/channels";
            $ts = time();
            $params = "auth_key={$key}&auth_timestamp={$ts}&auth_version=1.0";
            $sig = hash_hmac('sha256', "GET\n{$path}\n{$params}", $secret);
            $res = Http::get("https://api-{$cluster}.pusher.com{$path}?{$params}&auth_signature={$sig}");
            return $res->successful()
                ? ['success' => true, 'message' => 'Pusher credentials verified']
                : ['success' => false, 'message' => 'Pusher verification failed'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    private function testS3(array $config): array
    {
        try {
            $client = new \Aws\S3\S3Client([
                'version' => 'latest',
                'region' => $config['region'] ?? 'us-east-1',
                'credentials' => [
                    'key' => $config['access_key_id'] ?? '',
                    'secret' => $config['secret_access_key'] ?? '',
                ],
            ]);
            $client->headBucket(['Bucket' => $config['bucket'] ?? '']);
            return ['success' => true, 'message' => 'S3 bucket accessible'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function mapKey(): JsonResponse
    {
        $record = PlatformApiConfig::where('service', 'google_maps')->where('is_enabled', true)->first();
        if (!$record) return $this->success(['enabled' => false, 'key' => null]);
        $config = $record->config;
        return $this->success(['enabled' => true, 'key' => $config['api_key'] ?? null]);
    }

    /**
     * Proxy endpoint: fetches road-following polyline from Google Directions API.
     * Body: { stops: [[lat, lng], ...] }
     * Returns: { points: [[lat, lng], ...] } — decoded polyline coordinates.
     */
    public function directions(Request $request): JsonResponse
    {
        $stops = $request->input('stops', []);
        if (count($stops) < 2) return $this->error('At least 2 stops required', 422);

        $record = PlatformApiConfig::where('service', 'google_maps')->where('is_enabled', true)->first();
        if (!$record) return $this->error('Google Maps not configured', 422);

        $key = $record->config['api_key'] ?? null;
        if (!$key) return $this->error('Google Maps API key missing', 422);

        $origin      = implode(',', $stops[0]);
        $destination = implode(',', end($stops));
        $waypoints   = count($stops) > 2
            ? 'via:' . implode('|via:', array_map(fn($s) => implode(',', $s), array_slice($stops, 1, -1)))
            : null;

        try {
            $params = ['origin' => $origin, 'destination' => $destination, 'key' => $key];
            if ($waypoints) $params['waypoints'] = $waypoints;

            $res = Http::timeout(8)->get('https://maps.googleapis.com/maps/api/directions/json', $params);
            $data = $res->json();

            if (($data['status'] ?? '') !== 'OK') {
                return $this->error($data['error_message'] ?? 'Directions API error', 422);
            }

            $encoded = $data['routes'][0]['overview_polyline']['points'] ?? null;
            if (!$encoded) return $this->error('No polyline in response', 422);

            // Decode polyline manually (Google encoded polyline algorithm)
            $points = $this->decodePolyline($encoded);
            return $this->success(['points' => $points]);
        } catch (\Exception $e) {
            return $this->error('Directions request failed: ' . $e->getMessage(), 500);
        }
    }

    private function decodePolyline(string $encoded): array
    {
        $points = [];
        $index = 0;
        $lat = 0;
        $lng = 0;

        while ($index < strlen($encoded)) {
            $shift = 0;
            $result = 0;
            do {
                $b = ord($encoded[$index++]) - 63;
                $result |= ($b & 0x1f) << $shift;
                $shift += 5;
            } while ($b >= 0x20);
            $lat += ($result & 1) ? ~($result >> 1) : ($result >> 1);

            $shift = 0;
            $result = 0;
            do {
                $b = ord($encoded[$index++]) - 63;
                $result |= ($b & 0x1f) << $shift;
                $shift += 5;
            } while ($b >= 0x20);
            $lng += ($result & 1) ? ~($result >> 1) : ($result >> 1);

            $points[] = [$lat / 1e5, $lng / 1e5];
        }

        return $points;
    }

    private function testGoogleMaps(array $config): array
    {
        try {
            $res = Http::get('https://maps.googleapis.com/maps/api/geocode/json', [
                'address' => 'Nairobi, Kenya',
                'key' => $config['api_key'] ?? '',
            ]);
            return $res->json('status') === 'OK'
                ? ['success' => true, 'message' => 'Google Maps API key valid']
                : ['success' => false, 'message' => $res->json('error_message', 'Invalid API key')];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    private function maskSecrets(array $config): array
    {
        $secretKeys = ['api_key', 'auth_token', 'app_secret', 'secret_access_key', 'stripe_secret_key'];
        foreach ($secretKeys as $key) {
            if (!empty($config[$key])) $config[$key] = '••••••••';
        }
        return $config;
    }
}
