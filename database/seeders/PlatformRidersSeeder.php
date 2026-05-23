<?php
namespace Database\Seeders;
use App\Models\Rider;
use Illuminate\Database\Seeder;

class PlatformRidersSeeder extends Seeder {
    public function run(): void {
        $riders = [
            // Nairobi riders
            ['name' => 'David Kamau',      'phone' => '+254722113456', 'vehicle_type' => 'motorbike', 'coverage_city' => 'Westlands, Nairobi',       'coverage_lat' => -1.2641, 'coverage_lng' => 36.8042, 'coverage_radius_km' => 20, 'availability_status' => 'on_route'],
            ['name' => 'Sarah Wanjiku',    'phone' => '+254733228901', 'vehicle_type' => 'bicycle',   'coverage_city' => 'Parklands, Nairobi',       'coverage_lat' => -1.2634, 'coverage_lng' => 36.8172, 'coverage_radius_km' => 10, 'availability_status' => 'free'],
            ['name' => 'James Otieno',     'phone' => '+254700556712', 'vehicle_type' => 'motorbike', 'coverage_city' => 'Upper Hill, Nairobi',      'coverage_lat' => -1.2920, 'coverage_lng' => 36.8170, 'coverage_radius_km' => 25, 'availability_status' => 'on_route'],
            ['name' => 'Grace Achieng',    'phone' => '+254711334887', 'vehicle_type' => 'car',       'coverage_city' => 'Karen, Nairobi',           'coverage_lat' => -1.3289, 'coverage_lng' => 36.7116, 'coverage_radius_km' => 30, 'availability_status' => 'busy'],
            ['name' => 'Peter Njoroge',    'phone' => '+254726991003', 'vehicle_type' => 'motorbike', 'coverage_city' => 'Eastleigh, Nairobi',       'coverage_lat' => -1.2715, 'coverage_lng' => 36.8508, 'coverage_radius_km' => 15, 'availability_status' => 'unavailable', 'is_active' => false],
            // Dar es Salaam riders
            ['name' => 'Ali Hassan',       'phone' => '+255754221009', 'vehicle_type' => 'motorbike', 'coverage_city' => 'Dar es Salaam CBD',        'coverage_lat' => -6.8160, 'coverage_lng' => 39.2803, 'coverage_radius_km' => 25, 'availability_status' => 'on_route'],
            ['name' => 'Fatuma Salim',     'phone' => '+255712884330', 'vehicle_type' => 'bicycle',   'coverage_city' => 'Kinondoni, Dar es Salaam', 'coverage_lat' => -6.7924, 'coverage_lng' => 39.2083, 'coverage_radius_km' => 12, 'availability_status' => 'free'],
            ['name' => 'Hassan Mwamba',    'phone' => '+255769553112', 'vehicle_type' => 'motorbike', 'coverage_city' => 'Temeke, Dar es Salaam',    'coverage_lat' => -6.8489, 'coverage_lng' => 39.2765, 'coverage_radius_km' => 18, 'availability_status' => 'on_route'],
            // Kampala riders
            ['name' => 'Moses Byaruhanga', 'phone' => '+256772441882', 'vehicle_type' => 'motorbike', 'coverage_city' => 'Kampala Central',          'coverage_lat' => 0.3163,  'coverage_lng' => 32.5822, 'coverage_radius_km' => 20, 'availability_status' => 'free'],
            ['name' => 'Sylvia Nakato',    'phone' => '+256701337554', 'vehicle_type' => 'car',       'coverage_city' => 'Nakasero, Kampala',        'coverage_lat' => 0.3317,  'coverage_lng' => 32.5817, 'coverage_radius_km' => 15, 'availability_status' => 'busy'],
        ];
        foreach ($riders as $rd) {
            Rider::firstOrCreate(
                ['phone' => $rd['phone']],
                array_merge($rd, [
                    'organization_id' => null,
                    'is_active' => $rd['is_active'] ?? true,
                ])
            );
        }
        $this->command->info('Platform riders seeded: ' . count($riders));
    }
}
