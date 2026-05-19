<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'manage_organizations',
            'manage_platform_settings',
            'manage_facilities',
            'manage_riders',
            'manage_users',
            'view_analytics',
            'export_reports',
            'manage_tasks',
            'plan_routes',
            'dispatch_routes',
            'view_live_tracking',
            'manage_org_settings',
            'view_own_pickups',
            'confirm_receipt',
            'view_custody_photos',
            'manage_profile',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $orgAdmin = Role::firstOrCreate(['name' => 'org_admin', 'guard_name' => 'web']);
        $dispatcher = Role::firstOrCreate(['name' => 'dispatcher', 'guard_name' => 'web']);
        $labManager = Role::firstOrCreate(['name' => 'lab_manager', 'guard_name' => 'web']);
        $rider = Role::firstOrCreate(['name' => 'rider', 'guard_name' => 'web']);

        $superAdmin->givePermissionTo([
            'manage_organizations',
            'manage_platform_settings',
            'manage_profile',
        ]);

        $orgAdmin->givePermissionTo([
            'manage_facilities',
            'manage_riders',
            'manage_users',
            'view_analytics',
            'export_reports',
            'manage_tasks',
            'plan_routes',
            'dispatch_routes',
            'view_live_tracking',
            'manage_org_settings',
            'view_custody_photos',
            'manage_profile',
        ]);

        $dispatcher->givePermissionTo([
            'view_analytics',
            'manage_tasks',
            'plan_routes',
            'dispatch_routes',
            'view_live_tracking',
            'view_custody_photos',
            'manage_profile',
        ]);

        $labManager->givePermissionTo([
            'view_own_pickups',
            'confirm_receipt',
            'view_custody_photos',
            'manage_profile',
        ]);

        $rider->givePermissionTo(['manage_profile']);
    }
}
