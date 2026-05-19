<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('org.{orgId}.live', function ($user, int $orgId) {
    return $user->organization_id === $orgId
        || $user->hasRole('super_admin');
});

Broadcast::channel('driver.{riderId}', function ($user, int $riderId) {
    $rider = $user->rider;
    return $rider && $rider->id === $riderId;
});
