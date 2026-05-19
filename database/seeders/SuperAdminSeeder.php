<?php

namespace Database\Seeders;

use App\Models\PlatformSetting;
use App\Models\User;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'super@routehealth.com'],
            [
                'name' => 'RouteHealth Admin',
                'password' => bcrypt('RouteHealth@2024!'),
                'organization_id' => null,
                'is_active' => true,
            ]
        );

        $user->assignRole('super_admin');

        // Seed default platform settings
        $defaults = [
            ['key' => 'whatsapp_provider', 'value' => 'twilio', 'group' => 'whatsapp'],
            ['key' => 'whatsapp_phone', 'value' => '', 'group' => 'whatsapp'],
            ['key' => 'whatsapp_token', 'value' => '', 'group' => 'whatsapp'],
            ['key' => 'routing_max_tasks', 'value' => '100', 'group' => 'routing'],
            ['key' => 'routing_max_riders', 'value' => '20', 'group' => 'routing'],
            ['key' => 'routing_timeout_seconds', 'value' => '10', 'group' => 'routing'],
            ['key' => 'routing_engine_type', 'value' => 'internal', 'group' => 'routing'],
            ['key' => 'routing_engine_url', 'value' => '', 'group' => 'routing'],
            ['key' => 'routing_avg_speed_kmh', 'value' => '25', 'group' => 'routing'],
            ['key' => 'anomaly_detection_start_hour', 'value' => '6', 'group' => 'anomaly'],
            ['key' => 'anomaly_detection_end_hour', 'value' => '20', 'group' => 'anomaly'],
            ['key' => 'anomaly_stationary_minutes', 'value' => '20', 'group' => 'anomaly'],
            ['key' => 'anomaly_overdue_minutes', 'value' => '30', 'group' => 'anomaly'],
            ['key' => 'anomaly_offline_minutes', 'value' => '15', 'group' => 'anomaly'],
            ['key' => 'anomaly_deviation_meters', 'value' => '800', 'group' => 'anomaly'],
        ];

        foreach ($defaults as $setting) {
            PlatformSetting::firstOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
