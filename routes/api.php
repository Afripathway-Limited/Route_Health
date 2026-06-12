<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DriverAppController;
use App\Http\Controllers\Api\FacilityController;
use App\Http\Controllers\Api\LabManagerController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrgSettingsController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\PaymentGatewayController;
use App\Http\Controllers\Api\PlatformApiConfigController;
use App\Http\Controllers\Api\PlatformSettingsController;
use App\Http\Controllers\Api\RiderController;
use App\Http\Controllers\Api\RolePermissionsController;
use App\Http\Controllers\Api\RouteController;
use App\Http\Controllers\Api\SubscriptionPlanController;
use App\Http\Controllers\Api\SupportTicketController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\WhatsAppWebhookController;
use App\Http\Controllers\Api\CountriesController;
use App\Http\Controllers\Api\SuperAdminRiderController;
use Illuminate\Support\Facades\Route;

// ─── Public ───────────────────────────────────────────────────────────────────
Route::get('/countries', [CountriesController::class, 'index']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/auth/accept-invitation', [AuthController::class, 'acceptInvitation']);

// WhatsApp webhook (no auth — Twilio signs these requests)
Route::post('/webhooks/whatsapp', [WhatsAppWebhookController::class, 'handle']);

// ─── Authenticated ─────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', \App\Http\Middleware\EnsureOrganizationActive::class])->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);

    // ─── Super Admin ────────────────────────────────────────────────────────
    Route::middleware('role:super_admin')->prefix('super-admin')->group(function () {
        Route::get('/stats', [OrganizationController::class, 'platformStats']);
        Route::apiResource('organizations', OrganizationController::class);
        Route::patch('organizations/{organization}/suspend', [OrganizationController::class, 'suspend']);
        Route::patch('organizations/{organization}/activate', [OrganizationController::class, 'activate']);
        Route::post('organizations/{organization}/plan', [SubscriptionPlanController::class, 'assignPlan']);
        Route::get('organizations/{organization}/invoices', [SubscriptionPlanController::class, 'orgInvoices']);
        Route::get('/users', [OrganizationController::class, 'platformUsers']);
        Route::patch('/users/{user}/activate', [OrganizationController::class, 'activateUser']);
        Route::patch('/users/{user}/deactivate', [OrganizationController::class, 'deactivateUser']);

        // Subscription plans
        Route::apiResource('plans', SubscriptionPlanController::class);
        Route::get('/revenue', [SubscriptionPlanController::class, 'revenue']);

        // Platform settings
        Route::prefix('platform')->group(function () {
            Route::get('/settings', [PlatformSettingsController::class, 'index']);
            Route::put('/settings', [PlatformSettingsController::class, 'update']);
            Route::get('/health', [PlatformSettingsController::class, 'systemHealth']);
            Route::post('/clear-cache', [PlatformSettingsController::class, 'clearCache']);
            // Payment gateway
            Route::get('/payment-gateway', [PaymentGatewayController::class, 'show']);
            Route::put('/payment-gateway', [PaymentGatewayController::class, 'update']);
            Route::post('/payment-gateway/test', [PaymentGatewayController::class, 'testConnection']);
            // API configs
            Route::get('/api-configs', [PlatformApiConfigController::class, 'index']);
            Route::put('/api-configs/{service}', [PlatformApiConfigController::class, 'update']);
            Route::post('/api-configs/{service}/test', [PlatformApiConfigController::class, 'test']);
            // Roles & permissions
            Route::get('/roles', [RolePermissionsController::class, 'index']);
            Route::get('/permissions', [RolePermissionsController::class, 'permissions']);
            Route::put('/roles/{role}/permissions', [RolePermissionsController::class, 'updatePermissions']);
        });

        // Support tickets (super admin view)
        Route::get('/tickets', [SupportTicketController::class, 'adminIndex']);
        Route::patch('/tickets/{ticket}', [SupportTicketController::class, 'adminUpdate']);
        Route::post('/tickets/{ticket}/messages', [SupportTicketController::class, 'addMessage']);

        // Platform-level riders management
        Route::apiResource('riders', SuperAdminRiderController::class);
        Route::post('riders/{rider}/resend-invitation', [SuperAdminRiderController::class, 'resendInvitation']);
    });

    // ─── Organization Scoped (Admin + Dispatcher + Lab Manager) ────────────
    Route::get('/maps/key', [PlatformApiConfigController::class, 'mapKey']);
    Route::post('/maps/directions', [PlatformApiConfigController::class, 'directions']);

    Route::middleware('role:org_admin|dispatcher|lab_manager')->group(function () {

        // Admin-only routes
        Route::middleware('role:org_admin')->group(function () {
            // Facilities (full CRUD) with subscription limit check on create
            Route::get('facilities', [FacilityController::class, 'index']);
            Route::post('facilities', [FacilityController::class, 'store'])->middleware('subscription.limits:facilities');
            Route::get('facilities/{facility}', [FacilityController::class, 'show']);
            Route::put('facilities/{facility}', [FacilityController::class, 'update']);
            Route::delete('facilities/{facility}', [FacilityController::class, 'destroy']);
            Route::get('facilities/{facility}/history', [FacilityController::class, 'history']);

            // Riders (full CRUD) with subscription limit on create
            Route::get('riders', [RiderController::class, 'index']);
            Route::post('riders', [RiderController::class, 'store'])->middleware('subscription.limits:riders');
            Route::get('riders/{rider}', [RiderController::class, 'show']);
            Route::put('riders/{rider}', [RiderController::class, 'update']);
            Route::delete('riders/{rider}', [RiderController::class, 'destroy']);
            Route::patch('riders/{rider}/activate', [RiderController::class, 'activate']);
            Route::patch('riders/{rider}/deactivate', [RiderController::class, 'deactivate']);
            Route::get('riders/{rider}/performance', [RiderController::class, 'performance']);

            // User management
            Route::get('users', [UserManagementController::class, 'index']);
            Route::post('users/invite', [UserManagementController::class, 'invite']);
            Route::put('users/{user}/role', [UserManagementController::class, 'updateRole']);
            Route::patch('users/{user}/activate', [UserManagementController::class, 'activate']);
            Route::patch('users/{user}/deactivate', [UserManagementController::class, 'deactivate']);
            Route::delete('users/{user}', [UserManagementController::class, 'destroy']);

            // Analytics export (admin only)
            Route::get('analytics/export', [AnalyticsController::class, 'export']);

            // Org settings
            Route::get('settings', [OrgSettingsController::class, 'show']);
            Route::put('settings', [OrgSettingsController::class, 'update']);
            Route::put('settings/branding', [OrgSettingsController::class, 'updateBranding']);
            Route::post('settings/logo', [OrgSettingsController::class, 'uploadLogo']);
            Route::put('settings/whatsapp', [OrgSettingsController::class, 'updateWhatsapp']);
            Route::put('settings/notifications', [OrgSettingsController::class, 'updateNotifications']);
            Route::post('settings/whatsapp/test', [OrgSettingsController::class, 'testWhatsapp']);

            // Admin dashboard
            Route::get('analytics/admin-dashboard', [AnalyticsController::class, 'adminDashboard']);
            Route::get('analytics/sla-report', [AnalyticsController::class, 'slaReport']);
            Route::get('analytics/ai-summary', [AnalyticsController::class, 'aiSummary']);

            // Audit log
            Route::get('audit-logs', [AuditLogController::class, 'index']);

            // Support tickets (org user view)
            Route::get('support/tickets', [SupportTicketController::class, 'index']);
            Route::post('support/tickets', [SupportTicketController::class, 'store']);
            Route::get('support/tickets/{ticket}', [SupportTicketController::class, 'show']);
            Route::post('support/tickets/{ticket}/messages', [SupportTicketController::class, 'addMessage']);
        });

        // Dispatcher + Admin routes
        Route::middleware('role:org_admin|dispatcher')->group(function () {
            // Facilities (read for dispatchers)
            Route::get('facilities', [FacilityController::class, 'index'])->withoutMiddleware('role:org_admin');
            Route::get('facilities/{facility}', [FacilityController::class, 'show'])->withoutMiddleware('role:org_admin');

            // Riders (read for dispatchers)
            Route::get('riders', [RiderController::class, 'index'])->withoutMiddleware('role:org_admin');
            Route::get('riders/{rider}', [RiderController::class, 'show'])->withoutMiddleware('role:org_admin');

            // Tasks with subscription limit on create
            Route::get('tasks', [TaskController::class, 'index']);
            Route::post('tasks', [TaskController::class, 'store'])->middleware('subscription.limits:tasks');
            Route::get('tasks/{task}', [TaskController::class, 'show']);
            Route::put('tasks/{task}', [TaskController::class, 'update']);
            Route::delete('tasks/{task}', [TaskController::class, 'destroy']);
            Route::post('tasks/bulk-upload', [TaskController::class, 'bulkUpload']);
            Route::patch('tasks/{task}/reassign', [TaskController::class, 'reassign']);
            Route::patch('tasks/{task}/assign-rider', [TaskController::class, 'assignRider']);

            // Routes
            Route::get('routes', [RouteController::class, 'index']);
            Route::get('routes/{route}', [RouteController::class, 'show']);
            Route::get('routes/{route}/stops', [RouteController::class, 'stops']);
            Route::post('routes/optimize', [RouteController::class, 'optimize']);
            Route::post('routes/dispatch', [RouteController::class, 'dispatch']);

            // Live tracking
            Route::get('live/riders', [RouteController::class, 'liveRiders']);

            // Anomalies
            Route::get('anomalies', [RouteController::class, 'anomalies']);
            Route::patch('anomalies/{anomalyAlert}/dismiss', [RouteController::class, 'dismissAnomaly']);

            // Analytics
            Route::get('analytics/summary', [AnalyticsController::class, 'summary']);
            Route::get('analytics/daily', [AnalyticsController::class, 'daily']);
            Route::get('analytics/riders', [AnalyticsController::class, 'riders']);
            Route::get('analytics/facilities', [AnalyticsController::class, 'facilities']);
            Route::get('analytics/dispatcher-dashboard', [AnalyticsController::class, 'dispatcherDashboard']);
        });

        // Lab Manager routes
        Route::prefix('lab')->group(function () {
            Route::get('pickups/today', [LabManagerController::class, 'todayPickups']);
            Route::get('pickups/history', [LabManagerController::class, 'pickupHistory']);
            Route::post('confirmations/{routeStop}', [LabManagerController::class, 'confirm']);
            Route::get('custody/{routeStop}', [LabManagerController::class, 'custody']);
            Route::get('custody/{routeStop}/pdf', [LabManagerController::class, 'custodyPdf']);
        });

        // Analytics insights (admin + dispatcher)
        Route::middleware('role:org_admin|dispatcher')->get('analytics/insights', [AnalyticsController::class, 'insights']);

        // In-app notifications (all authenticated org users)
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::patch('notifications/{notification}/read', [NotificationController::class, 'markRead']);
        Route::patch('notifications/read-all', [NotificationController::class, 'markAllRead']);
    });

    // ─── Driver App (Rider only) ────────────────────────────────────────────
    Route::middleware('role:rider')->prefix('driver')->group(function () {
        Route::get('routes/today', [DriverAppController::class, 'todayRoutes']);
        Route::patch('routes/{route}/start', [DriverAppController::class, 'startRoute']);
        Route::patch('routes/{route}/complete', [DriverAppController::class, 'completeRoute']);
        Route::patch('stops/{stop}/arrive', [DriverAppController::class, 'arriveAtStop']);
        Route::post('stops/{stop}/photo', [DriverAppController::class, 'uploadPhoto']);
        Route::patch('stops/{stop}/collect', [DriverAppController::class, 'collectStop']);
        Route::patch('stops/{stop}/deliver', [DriverAppController::class, 'deliverStop']);
        Route::patch('stops/{stop}/fail', [DriverAppController::class, 'failStop']);
        Route::post('location', [DriverAppController::class, 'updateLocation']);
        Route::post('sync', [DriverAppController::class, 'sync']);
    });
});
