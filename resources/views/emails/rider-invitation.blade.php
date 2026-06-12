<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Rider Invitation — RouteHealth</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f6fb; margin: 0; padding: 32px 16px; color: #1a1a2e; }
    .card { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #4F6EF7; padding: 32px 36px; text-align: center; }
    .header h1 { color: #fff; font-size: 22px; font-weight: 700; margin: 0 0 4px; }
    .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; }
    .body { padding: 32px 36px; }
    .body p { font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 16px; }
    .info-box { background: #f0f4ff; border-radius: 10px; padding: 16px 20px; margin: 24px 0; border-left: 3px solid #4F6EF7; }
    .info-box p { margin: 4px 0; font-size: 14px; color: #4b5563; }
    .info-box strong { color: #1a1a2e; }
    .btn { display: block; text-align: center; background: #4F6EF7; color: #fff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; margin: 28px 0; }
    .footer { padding: 20px 36px; border-top: 1px solid #f3f4f6; text-align: center; }
    .footer p { font-size: 12px; color: #9ca3af; margin: 4px 0; }
    .url-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #6b7280; word-break: break-all; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🚴 Welcome to RouteHealth</h1>
      <p>You've been added as a rider on the platform</p>
    </div>
    <div class="body">
      <p>Hi <strong>{{ $user->name }}</strong>,</p>
      <p>You've been registered as a rider on the RouteHealth platform. To activate your account and start receiving routes, please set your password by clicking the button below.</p>

      <div class="info-box">
        <p><strong>Name:</strong> {{ $rider->name }}</p>
        <p><strong>Email:</strong> {{ $user->email }}</p>
        <p><strong>Vehicle:</strong> {{ ucfirst($rider->vehicle_type) }}</p>
        @if($rider->coverage_city)
        <p><strong>Coverage Area:</strong> {{ $rider->coverage_city }}</p>
        @endif
      </div>

      <a href="{{ $inviteUrl }}" class="btn">Set My Password &amp; Activate Account</a>

      <p style="font-size:13px; color:#6b7280;">This invitation link expires in <strong>7 days</strong>. If you were not expecting this email, you can safely ignore it.</p>

      <p style="font-size:12px; color:#9ca3af;">If the button above doesn't work, copy and paste this link into your browser:</p>
      <div class="url-box">{{ $inviteUrl }}</div>
    </div>
    <div class="footer">
      <p>RouteHealth — Medical Logistics Platform</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
