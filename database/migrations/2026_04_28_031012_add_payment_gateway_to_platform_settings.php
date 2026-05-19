<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // platform_settings uses key/value rows — seed the gateway keys
        $keys = [
            'stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret',
            'paystack_public_key', 'paystack_secret_key', 'paystack_webhook_secret',
            'active_payment_gateway', 'payment_gateway_test_mode',
        ];
        foreach ($keys as $key) {
            \DB::table('platform_settings')->insertOrIgnore(['key' => $key, 'value' => '', 'group' => 'payment']);
        }
    }

    public function down(): void
    {
        \DB::table('platform_settings')->whereIn('key', [
            'stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret',
            'paystack_public_key', 'paystack_secret_key', 'paystack_webhook_secret',
            'active_payment_gateway', 'payment_gateway_test_mode',
        ])->delete();
    }
};
