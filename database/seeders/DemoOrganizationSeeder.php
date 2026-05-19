<?php

namespace Database\Seeders;

use App\Models\AnomalyAlert;
use App\Models\CustodyPhoto;
use App\Models\DriverLocation;
use App\Models\EtaHistory;
use App\Models\Facility;
use App\Models\Organization;
use App\Models\Rider;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\Task;
use App\Models\User;
use App\Models\WhatsappLog;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DemoOrganizationSeeder extends Seeder
{
    public function run(): void
    {
        // Create organization
        $org = Organization::firstOrCreate(
            ['subdomain' => 'pathcare'],
            [
                'name' => 'PathCare Diagnostics Kenya',
                'country' => 'Kenya',
                'primary_color' => '#10B981',
                'subdomain' => 'pathcare',
                'whatsapp_phone' => '+254700000000',
                'whatsapp_provider' => 'twilio',
                'status' => 'active',
                'subscription_plan' => 'professional',
                'max_riders' => 20,
                'max_facilities' => 50,
                'max_tasks_per_month' => 2000,
                'notification_preferences' => [
                    'disputed_delivery_email' => true,
                    'disputed_delivery_whatsapp' => true,
                    'overdue_stop_email' => true,
                    'overdue_stop_whatsapp' => false,
                    'rider_offline_email' => true,
                    'rider_offline_whatsapp' => false,
                    'daily_summary_email' => true,
                    'failed_pickup_email' => true,
                    'failed_pickup_whatsapp' => true,
                ],
            ]
        );

        // Create users
        $admin = User::firstOrCreate(
            ['email' => 'admin@pathcare.ke'],
            [
                'name' => 'James Kariuki',
                'password' => bcrypt('Demo@2024!'),
                'organization_id' => $org->id,
                'phone' => '+254722001001',
                'is_active' => true,
            ]
        );
        $admin->assignRole('org_admin');

        $dispatcher = User::firstOrCreate(
            ['email' => 'dispatcher@pathcare.ke'],
            [
                'name' => 'Mary Wanjiku',
                'password' => bcrypt('Demo@2024!'),
                'organization_id' => $org->id,
                'phone' => '+254722001002',
                'is_active' => true,
            ]
        );
        $dispatcher->assignRole('dispatcher');

        $labUser = User::firstOrCreate(
            ['email' => 'lab@nairobi-general.ke'],
            [
                'name' => 'Dr. Amina Osei',
                'password' => bcrypt('Demo@2024!'),
                'organization_id' => $org->id,
                'phone' => '+254722001003',
                'is_active' => true,
            ]
        );
        $labUser->assignRole('lab_manager');

        // Create facilities (10 Nairobi locations)
        $facilitiesData = [
            ['name' => 'Nairobi General Hospital', 'type' => 'hospital', 'lat' => -1.3007, 'lng' => 36.8300, 'city' => 'Nairobi', 'contact' => 'Dr. Amina Osei', 'phone' => '+254722101010'],
            ['name' => 'Aga Khan Hospital', 'type' => 'hospital', 'lat' => -1.2634, 'lng' => 36.8138, 'city' => 'Nairobi', 'contact' => 'Nurse Grace Mwangi', 'phone' => '+254722101011'],
            ['name' => 'MP Shah Hospital', 'type' => 'hospital', 'lat' => -1.2799, 'lng' => 36.8191, 'city' => 'Nairobi', 'contact' => 'Lab Tech John Otieno', 'phone' => '+254722101012'],
            ['name' => 'Gertrude Children Hospital', 'type' => 'hospital', 'lat' => -1.2570, 'lng' => 36.8200, 'city' => 'Nairobi', 'contact' => 'Nurse Faith Kamau', 'phone' => '+254722101013'],
            ['name' => 'Kenyatta National Hospital', 'type' => 'hospital', 'lat' => -1.3022, 'lng' => 36.8067, 'city' => 'Nairobi', 'contact' => 'Dr. Peter Ndegwa', 'phone' => '+254722101014'],
            ['name' => 'Karen Hospital', 'type' => 'hospital', 'lat' => -1.3188, 'lng' => 36.7052, 'city' => 'Karen', 'contact' => 'Lab Manager Alice Njiru', 'phone' => '+254722101015'],
            ['name' => 'Westlands Clinic', 'type' => 'clinic', 'lat' => -1.2584, 'lng' => 36.7961, 'city' => 'Westlands', 'contact' => 'Nurse Anne Wachira', 'phone' => '+254722101016'],
            ['name' => 'Eastleigh Medical Centre', 'type' => 'clinic', 'lat' => -1.2753, 'lng' => 36.8529, 'city' => 'Eastleigh', 'contact' => 'Pharmacist Hassan Ahmed', 'phone' => '+254722101017'],
            ['name' => 'Githurai Clinic', 'type' => 'clinic', 'lat' => -1.2139, 'lng' => 36.9106, 'city' => 'Githurai', 'contact' => 'Nurse Purity Wanjiku', 'phone' => '+254722101018'],
            ['name' => 'Kasarani Health Centre', 'type' => 'clinic', 'lat' => -1.2324, 'lng' => 36.9001, 'city' => 'Kasarani', 'contact' => 'Lab Tech Samuel Kiprotich', 'phone' => '+254722101019'],
        ];

        $facilities = [];
        foreach ($facilitiesData as $fd) {
            $f = Facility::firstOrCreate(
                ['organization_id' => $org->id, 'name' => $fd['name']],
                [
                    'organization_id' => $org->id,
                    'name' => $fd['name'],
                    'address_line_1' => $fd['name'] . ', ' . $fd['city'],
                    'city' => $fd['city'],
                    'country' => 'Kenya',
                    'latitude' => $fd['lat'],
                    'longitude' => $fd['lng'],
                    'facility_type' => $fd['type'],
                    'contact_name' => $fd['contact'],
                    'contact_phone' => $fd['phone'],
                    'special_notes' => 'Sample collection at reception. Weekdays 7am-5pm.',
                    'is_active' => true,
                ]
            );
            $facilities[] = $f;
        }

        // Update lab manager to be linked to first facility
        // (stored as user org_id, role lab_manager — they see stops at any facility for now)

        // Create riders
        $ridersData = [
            ['name' => 'David Kamau', 'phone' => '+254733101001', 'vehicle' => 'motorbike'],
            ['name' => 'Sarah Wanjiku', 'phone' => '+254733101002', 'vehicle' => 'motorbike'],
            ['name' => 'James Otieno', 'phone' => '+254733101003', 'vehicle' => 'bicycle'],
            ['name' => 'Grace Achieng', 'phone' => '+254733101004', 'vehicle' => 'motorbike'],
            ['name' => 'Peter Njoroge', 'phone' => '+254733101005', 'vehicle' => 'car'],
        ];

        $riders = [];
        foreach ($ridersData as $i => $rd) {
            $r = Rider::firstOrCreate(
                ['organization_id' => $org->id, 'phone' => $rd['phone']],
                [
                    'organization_id' => $org->id,
                    'name' => $rd['name'],
                    'phone' => $rd['phone'],
                    'vehicle_type' => $rd['vehicle'],
                    'home_facility_id' => $facilities[$i % count($facilities)]->id,
                    'photo_url' => 'https://i.pravatar.cc/150?img=' . ($i + 10),
                    'is_active' => true,
                ]
            );
            $riders[] = $r;
        }

        // Skip if demo data already seeded
        if (Route::where('organization_id', $org->id)->count() > 0) {
            return;
        }

        // Create historical routes + tasks (past 7 days)
        $depot = $facilities[0]; // Nairobi General as depot
        $statuses = ['completed', 'completed', 'completed', 'completed', 'completed'];

        for ($day = 6; $day >= 0; $day--) {
            $date = Carbon::today()->subDays($day);
            $riderSubset = array_slice($riders, 0, 3);

            foreach ($riderSubset as $rIndex => $rider) {
                $route = Route::create([
                    'organization_id' => $org->id,
                    'rider_id' => $rider->id,
                    'date' => $date->toDateString(),
                    'status' => $day === 0 ? 'in_progress' : 'completed',
                    'depot_latitude' => $depot->latitude,
                    'depot_longitude' => $depot->longitude,
                    'planned_start_time' => $date->copy()->setHour(8)->setMinute(0),
                    'planned_end_time' => $date->copy()->setHour(14)->setMinute(0),
                    'actual_start_time' => $day === 0 ? $date->copy()->setHour(8)->setMinute(15) : $date->copy()->setHour(8)->setMinute(rand(5, 20)),
                    'actual_end_time' => $day === 0 ? null : $date->copy()->setHour(13)->setMinute(rand(30, 59)),
                    'total_distance_km' => round(rand(25, 45) + (rand(0, 99) / 100), 2),
                    'total_stops' => 4,
                ]);

                // Create 4 tasks and stops per route
                $facilitySubset = array_slice($facilities, $rIndex * 2, 4);
                $currentTime = $date->copy()->setHour(8)->setMinute(30);

                foreach ($facilitySubset as $sIndex => $facility) {
                    $plannedArrival = $currentTime->copy()->addMinutes($sIndex * 60);
                    $delayMinutes = $day === 0 ? rand(-5, 15) : rand(-10, 25);
                    $isCompleted = $day !== 0 || $sIndex < 2;

                    $task = Task::create([
                        'organization_id' => $org->id,
                        'facility_id' => $facility->id,
                        'type' => 'pickup',
                        'scheduled_date' => $date->toDateString(),
                        'time_window_start' => $plannedArrival->format('H:i:s'),
                        'time_window_end' => $plannedArrival->copy()->addHour()->format('H:i:s'),
                        'priority' => $sIndex === 0 && $rIndex === 0 ? 'urgent' : 'standard',
                        'status' => $isCompleted ? 'completed' : 'in_progress',
                        'route_id' => $route->id,
                        'created_by' => $dispatcher->id,
                    ]);

                    $stopStatus = $isCompleted ? 'confirmed_delivered' : 'arrived';
                    if ($day > 0 && rand(0, 10) < 2) $stopStatus = $sIndex % 8 === 0 ? 'disputed' : 'confirmed_delivered';

                    $stop = RouteStop::create([
                        'route_id' => $route->id,
                        'task_id' => $task->id,
                        'sequence' => $sIndex + 1,
                        'planned_arrival' => $plannedArrival,
                        'actual_arrival' => $isCompleted ? $plannedArrival->copy()->addMinutes($delayMinutes) : $plannedArrival,
                        'status' => $stopStatus,
                        'whatsapp_sent' => $isCompleted,
                        'whatsapp_sent_at' => $isCompleted ? $plannedArrival->copy()->addMinutes($delayMinutes + 5) : null,
                    ]);

                    // Create custody photos for completed stops
                    if ($isCompleted) {
                        $photoTime = $plannedArrival->copy()->addMinutes($delayMinutes);

                        CustodyPhoto::create([
                            'route_stop_id' => $stop->id,
                            'organization_id' => $org->id,
                            'photo_type' => 'pickup',
                            'photo_url' => 'https://picsum.photos/seed/' . $stop->id . 'p/800/600',
                            'thumbnail_url' => 'https://picsum.photos/seed/' . $stop->id . 'p/200/150',
                            'latitude' => $facility->latitude + (rand(-100, 100) / 100000),
                            'longitude' => $facility->longitude + (rand(-100, 100) / 100000),
                            'taken_at' => $photoTime,
                            'uploaded_at' => $photoTime->copy()->addMinutes(2),
                            'device_id' => 'DEVICE-RH-' . str_pad($rider->id, 4, '0', STR_PAD_LEFT),
                        ]);

                        CustodyPhoto::create([
                            'route_stop_id' => $stop->id,
                            'organization_id' => $org->id,
                            'photo_type' => 'delivery',
                            'photo_url' => 'https://picsum.photos/seed/' . $stop->id . 'd/800/600',
                            'thumbnail_url' => 'https://picsum.photos/seed/' . $stop->id . 'd/200/150',
                            'latitude' => $depot->latitude + (rand(-100, 100) / 100000),
                            'longitude' => $depot->longitude + (rand(-100, 100) / 100000),
                            'taken_at' => $photoTime->copy()->addHours(2),
                            'uploaded_at' => $photoTime->copy()->addHours(2)->addMinutes(1),
                            'device_id' => 'DEVICE-RH-' . str_pad($rider->id, 4, '0', STR_PAD_LEFT),
                        ]);

                        // ETA history
                        EtaHistory::create([
                            'route_stop_id' => $stop->id,
                            'facility_id' => $facility->id,
                            'rider_id' => $rider->id,
                            'planned_arrival' => $plannedArrival,
                            'actual_arrival' => $plannedArrival->copy()->addMinutes($delayMinutes),
                            'delay_minutes' => $delayMinutes,
                            'day_of_week' => $date->dayOfWeek,
                            'hour_of_day' => $plannedArrival->hour,
                        ]);
                    }

                    // Driver locations for route
                    for ($loc = 0; $loc <= 5; $loc++) {
                        DriverLocation::create([
                            'rider_id' => $rider->id,
                            'route_id' => $route->id,
                            'latitude' => $facility->latitude + (rand(-500, 500) / 10000),
                            'longitude' => $facility->longitude + (rand(-500, 500) / 10000),
                            'accuracy' => rand(5, 30),
                            'recorded_at' => $plannedArrival->copy()->addMinutes($loc * 2),
                        ]);
                    }

                    // WhatsApp logs
                    if ($isCompleted) {
                        WhatsappLog::create([
                            'organization_id' => $org->id,
                            'to_phone' => $facility->contact_phone,
                            'message_type' => 'delivery_confirmation',
                            'message_body' => $rider->name . ' has delivered your sample. Did you receive it? Reply YES or NO.',
                            'status' => 'delivered',
                            'stop_id' => $stop->id,
                            'rider_id' => $rider->id,
                            'twilio_sid' => 'SM' . strtoupper(bin2hex(random_bytes(16))),
                            'sent_at' => $plannedArrival->copy()->addMinutes($delayMinutes + 10),
                        ]);
                    }
                }
            }
        }

        // Create today's unassigned tasks
        for ($i = 0; $i < 10; $i++) {
            $facility = $facilities[$i % count($facilities)];
            $hour = rand(8, 15);

            Task::create([
                'organization_id' => $org->id,
                'facility_id' => $facility->id,
                'type' => 'pickup',
                'scheduled_date' => Carbon::today()->toDateString(),
                'time_window_start' => sprintf('%02d:00:00', $hour),
                'time_window_end' => sprintf('%02d:00:00', $hour + 2),
                'priority' => $i < 2 ? 'urgent' : 'standard',
                'status' => 'planned',
                'created_by' => $dispatcher->id,
            ]);
        }

        // Create anomaly alerts
        $activeRoute = Route::where('organization_id', $org->id)->where('status', 'in_progress')->first();
        if ($activeRoute) {
            AnomalyAlert::create([
                'organization_id' => $org->id,
                'route_id' => $activeRoute->id,
                'rider_id' => $activeRoute->rider_id,
                'alert_type' => 'overdue_stop',
                'description' => 'Stop at Westlands Clinic is 35 minutes overdue. Rider has not marked arrival.',
                'severity' => 'warning',
                'triggered_at' => now()->subMinutes(10),
                'is_dismissed' => false,
            ]);

            AnomalyAlert::create([
                'organization_id' => $org->id,
                'route_id' => $activeRoute->id,
                'rider_id' => $activeRoute->rider_id,
                'alert_type' => 'stationary_too_long',
                'description' => 'Rider David Kamau has been stationary for 22 minutes at current location.',
                'severity' => 'warning',
                'triggered_at' => now()->subMinutes(25),
                'resolved_at' => now()->subMinutes(5),
                'is_dismissed' => true,
            ]);
        }

        $this->command->info('Demo organization seeded: PathCare Diagnostics Kenya');
        $this->command->info('Admin: admin@pathcare.ke / Demo@2024!');
        $this->command->info('Dispatcher: dispatcher@pathcare.ke / Demo@2024!');
        $this->command->info('Lab Manager: lab@nairobi-general.ke / Demo@2024!');
    }
}
