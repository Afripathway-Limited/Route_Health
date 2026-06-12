<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            SubscriptionPlansSeeder::class,
            CountriesSeeder::class,
            SuperAdminSeeder::class,
            DemoOrganizationSeeder::class,
            PlatformRidersSeeder::class,
        ]);
    }
}
