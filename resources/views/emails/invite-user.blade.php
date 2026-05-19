<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to RouteHealth</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f6f9; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #0A0F1E; padding: 32px 40px; text-align: center; }
    .header-logo { display: inline-flex; align-items: center; gap: 10px; }
    .logo-icon { width: 36px; height: 36px; background: #10B981; border-radius: 8px; display: inline-block; }
    .logo-text { font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
    .logo-text span { color: #10B981; }
    .body { padding: 40px; }
    h1 { font-size: 24px; font-weight: 700; color: #0A0F1E; margin: 0 0 12px; line-height: 1.3; }
    p { font-size: 15px; color: #4B5563; line-height: 1.7; margin: 0 0 16px; }
    .org-badge { display: inline-block; background: #ECFDF5; color: #059669; font-weight: 600; padding: 4px 12px; border-radius: 20px; font-size: 13px; margin-bottom: 20px; }
    .cta-btn { display: block; width: fit-content; margin: 28px auto; background: #10B981; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; }
    .credentials { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 20px 24px; margin: 24px 0; }
    .credentials h3 { font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.8px; margin: 0 0 14px; }
    .cred-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #F3F4F6; }
    .cred-row:last-child { border-bottom: none; }
    .cred-label { font-size: 13px; color: #6B7280; }
    .cred-value { font-size: 13px; font-weight: 600; color: #111827; font-family: monospace; }
    .security-note { background: #FFF7ED; border-left: 3px solid #F59E0B; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #92400E; margin: 20px 0; }
    .footer { background: #F9FAFB; padding: 24px 40px; text-align: center; border-top: 1px solid #E5E7EB; }
    .footer p { font-size: 12px; color: #9CA3AF; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">
        <div class="logo-icon"></div>
        <div class="logo-text">Route<span>Health</span></div>
      </div>
    </div>

    <div class="body">
      <span class="org-badge">{{ $organization->name }}</span>
      <h1>You've been invited to join {{ $organization->name }}</h1>

      <p>Hi {{ $user->name }},</p>
      <p>
        You've been added to <strong>{{ $organization->name }}</strong> on RouteHealth as a
        <strong>{{ $roleName }}</strong>. RouteHealth is a health-specific last-mile delivery
        logistics platform for medical samples and supplies.
      </p>

      <a href="{{ $loginUrl }}" class="cta-btn">Set Up Your Account →</a>

      <div class="credentials">
        <h3>Your temporary login credentials</h3>
        <div class="cred-row">
          <span class="cred-label">Email</span>
          <span class="cred-value">{{ $user->email }}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Temporary Password</span>
          <span class="cred-value">{{ $tempPassword }}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Login URL</span>
          <span class="cred-value">{{ $loginUrl }}</span>
        </div>
      </div>

      <div class="security-note">
        ⚠️ This temporary password should be changed immediately after your first login. You will be prompted to set a new password when you first access the platform.
      </div>

      <p>
        If you have any questions, contact your organization administrator or reply to this email.
      </p>
    </div>

    <div class="footer">
      <p>© {{ date('Y') }} RouteHealth · Health-grade last-mile logistics</p>
      <p style="margin-top: 6px;">This invitation was sent to {{ $user->email }}. If you didn't expect this, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>
