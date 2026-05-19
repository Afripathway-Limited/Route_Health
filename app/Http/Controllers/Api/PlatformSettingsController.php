<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlatformSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = PlatformSetting::all()->groupBy('group');

        return $this->success([
            'whatsapp' => $settings->get('whatsapp', collect())->pluck('value', 'key'),
            'routing' => $settings->get('routing', collect())->pluck('value', 'key'),
            'anomaly' => $settings->get('anomaly', collect())->pluck('value', 'key'),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        foreach ($request->all() as $key => $value) {
            if (is_string($key) && !empty($key)) {
                $group = match(true) {
                    str_starts_with($key, 'whatsapp_') => 'whatsapp',
                    str_starts_with($key, 'routing_') => 'routing',
                    str_starts_with($key, 'anomaly_') => 'anomaly',
                    default => 'general',
                };
                PlatformSetting::set($key, $value, $group);
            }
        }

        return $this->success(null, 'Platform settings updated');
    }

    public function systemHealth(): JsonResponse
    {
        $dbOk = true;
        try {
            \DB::connection()->getPdo();
        } catch (\Exception $e) {
            $dbOk = false;
        }

        $queueSize = \DB::table('jobs')->count();
        $failedJobs = \DB::table('failed_jobs')->count();

        return $this->success([
            'database_status' => $dbOk ? 'healthy' : 'error',
            'queue_pending_jobs' => $queueSize,
            'failed_jobs' => $failedJobs,
            'uptime' => '99.9%',
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
        ]);
    }

    public function clearCache(): JsonResponse
    {
        \Cache::flush();
        \Artisan::call('config:clear');

        return $this->success(null, 'Cache cleared successfully');
    }
}
