<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; color: #111827; }
  .wrapper { max-width: 600px; margin: 32px auto; }
  .header { background: linear-gradient(135deg, #064e3b, #065f46); padding: 32px; border-radius: 16px 16px 0 0; }
  .header h1 { color: #fff; font-size: 20px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 4px; }
  .body { background: #fff; padding: 32px; }
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
  .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; }
  .stat-card .value { font-size: 28px; font-weight: 700; color: #111827; }
  .stat-card .label { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-card.green .value { color: #059669; }
  .stat-card.red .value { color: #dc2626; }
  .stat-card.amber .value { color: #d97706; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
  .highlight-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  .highlight-row .label { color: #374151; }
  .highlight-row .value { font-weight: 600; color: #111827; }
  .alert-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 10px; padding: 14px 16px; margin-top: 16px; font-size: 13px; color: #92400e; }
  .cta { text-align: center; margin-top: 28px; }
  .cta a { display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; }
  .footer { background: #f9fafb; padding: 20px 32px; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>{{ $organization->name }}</h1>
    <p>Daily Operations Summary — {{ $stats['date'] }}</p>
  </div>

  <div class="body">
    <p style="font-size:14px; color:#6b7280;">Here's how your operations performed today.</p>

    <div class="stats-grid">
      <div class="stat-card green">
        <div class="value">{{ $stats['completion_rate'] }}%</div>
        <div class="label">Completion Rate</div>
      </div>
      <div class="stat-card">
        <div class="value">{{ $stats['total_routes'] }}</div>
        <div class="label">Routes Today</div>
      </div>
      <div class="stat-card">
        <div class="value">{{ $stats['completed_stops'] }}</div>
        <div class="label">Stops Completed</div>
      </div>
      <div class="stat-card {{ $stats['failed_stops'] > 0 ? 'red' : '' }}">
        <div class="value">{{ $stats['failed_stops'] }}</div>
        <div class="label">Failed Stops</div>
      </div>
    </div>

    @if($stats['disputed_stops'] > 0 || $stats['unresolved_alerts'] > 0)
    <div class="section-title">Attention Required</div>
    @if($stats['disputed_stops'] > 0)
    <div class="alert-box">⚠️ {{ $stats['disputed_stops'] }} disputed {{ Str::plural('delivery', $stats['disputed_stops']) }} need your review.</div>
    @endif
    @if($stats['unresolved_alerts'] > 0)
    <div class="alert-box">🔔 {{ $stats['unresolved_alerts'] }} unresolved anomaly {{ Str::plural('alert', $stats['unresolved_alerts']) }} from today.</div>
    @endif
    @endif

    <div class="section-title">Summary</div>
    <div class="highlight-row"><span class="label">Total Stops Scheduled</span><span class="value">{{ $stats['total_stops'] }}</span></div>
    <div class="highlight-row"><span class="label">Completed</span><span class="value" style="color:#059669">{{ $stats['completed_stops'] }}</span></div>
    <div class="highlight-row"><span class="label">Failed</span><span class="value" style="color:{{ $stats['failed_stops'] > 0 ? '#dc2626' : '#111827' }}">{{ $stats['failed_stops'] }}</span></div>
    <div class="highlight-row"><span class="label">Disputed</span><span class="value" style="color:{{ $stats['disputed_stops'] > 0 ? '#d97706' : '#111827' }}">{{ $stats['disputed_stops'] }}</span></div>

    <div class="cta">
      <a href="{{ config('app.frontend_url') }}/admin/analytics">View Full Analytics →</a>
    </div>
  </div>

  <div class="footer">
    <p>RouteHealth • Medical Logistics Platform</p>
    <p style="margin-top:4px;">You're receiving this because daily summary is enabled for your organization.</p>
  </div>
</div>
</body>
</html>
