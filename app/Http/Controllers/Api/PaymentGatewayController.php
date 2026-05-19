<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PaymentGatewayController extends Controller
{
    private array $gatewayKeys = [
        'stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret',
        'paystack_public_key', 'paystack_secret_key', 'paystack_webhook_secret',
        'active_payment_gateway', 'payment_gateway_test_mode',
    ];

    public function show(): JsonResponse
    {
        $settings = PlatformSetting::whereIn('key', $this->gatewayKeys)->pluck('value', 'key');
        // Mask secret keys
        foreach (['stripe_secret_key', 'stripe_webhook_secret', 'paystack_secret_key', 'paystack_webhook_secret'] as $k) {
            if (!empty($settings[$k])) $settings[$k] = '••••••••';
        }
        return $this->success($settings);
    }

    public function update(Request $request): JsonResponse
    {
        foreach ($request->only($this->gatewayKeys) as $key => $value) {
            if ($value === '••••••••') continue; // skip masked values
            PlatformSetting::updateOrCreate(['key' => $key], ['value' => $value, 'group' => 'payment']);
        }
        return $this->success(null, 'Payment gateway settings saved');
    }

    public function testConnection(Request $request): JsonResponse
    {
        $gateway = $request->validate(['gateway' => 'required|in:stripe,paystack'])['gateway'];

        if ($gateway === 'stripe') {
            $secret = PlatformSetting::get('stripe_secret_key');
            if (!$secret) return $this->error('Stripe secret key not configured', 422);
            $res = Http::withToken($secret)->get('https://api.stripe.com/v1/balance');
            return $res->successful()
                ? $this->success(null, 'Stripe connection successful')
                : $this->error($res->json('error.message', 'Stripe connection failed'), 422);
        }

        $secret = PlatformSetting::get('paystack_secret_key');
        if (!$secret) return $this->error('Paystack secret key not configured', 422);
        $res = Http::withToken($secret)->get('https://api.paystack.co/balance');
        return $res->successful()
            ? $this->success(null, 'Paystack connection successful')
            : $this->error($res->json('message', 'Paystack connection failed'), 422);
    }
}
