<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; background: #fff; }
  .header { background: #064e3b; color: #fff; padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { font-size: 11px; opacity: 0.75; margin-top: 2px; }
  .badge { display: inline-block; background: #10b981; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; letter-spacing: 0.5px; text-transform: uppercase; }
  .body { padding: 32px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .field label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
  .field p { font-size: 13px; font-weight: 600; color: #111827; margin-top: 2px; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .status-confirmed { background: #d1fae5; color: #065f46; }
  .status-disputed { background: #fee2e2; color: #991b1b; }
  .status-default { background: #f3f4f6; color: #374151; }
  .photo-section { margin-bottom: 24px; }
  .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .photo-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .photo-card-header { background: #f9fafb; padding: 8px 12px; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; }
  .photo-card img { width: 100%; height: 160px; object-fit: cover; display: block; }
  .photo-meta { padding: 8px 12px; font-size: 10px; color: #6b7280; }
  .no-photo { height: 120px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 11px; background: #f9fafb; }
  .wa-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
  .wa-box .label { font-size: 10px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .wa-box p { font-size: 12px; color: #065f46; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-left { font-size: 10px; color: #6b7280; }
  .footer-right { text-align: right; font-size: 10px; color: #9ca3af; }
  .seal { border: 2px solid #10b981; border-radius: 50%; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 8px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.3px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Chain of Custody</h1>
      <p>Official Proof of Delivery Document — {{ $organization }}</p>
    </div>
    <div class="badge">Stop #{{ $stop_id }}</div>
  </div>

  <div class="body">

    <!-- Core Details -->
    <div class="section-title">Delivery Details</div>
    <div class="grid" style="margin-bottom:24px;">
      <div class="field">
        <label>Facility</label>
        <p>{{ $facility ?? '—' }}</p>
      </div>
      <div class="field">
        <label>Rider</label>
        <p>{{ $rider ?? '—' }}</p>
      </div>
      <div class="field">
        <label>Status</label>
        @php
          $sc = match($status ?? '') {
            'confirmed_delivered' => 'status-confirmed',
            'disputed' => 'status-disputed',
            default => 'status-default',
          };
        @endphp
        <span class="status-badge {{ $sc }}">{{ str_replace('_', ' ', $status ?? '—') }}</span>
      </div>
      <div class="field">
        <label>Planned Arrival</label>
        <p>{{ $planned_arrival ? \Carbon\Carbon::parse($planned_arrival)->format('d M Y, g:i A') : '—' }}</p>
      </div>
      <div class="field">
        <label>Actual Arrival</label>
        <p>{{ $actual_arrival ? \Carbon\Carbon::parse($actual_arrival)->format('d M Y, g:i A') : '—' }}</p>
      </div>
      <div class="field">
        <label>Route Date</label>
        <p>{{ $route_date ?? '—' }}</p>
      </div>
    </div>

    <!-- Photos -->
    <div class="section-title">Photographic Evidence</div>
    <div class="photo-section">
      <div class="photo-grid">
        @foreach([['label' => 'Pickup Photo', 'photo' => $pickup_photo ?? null], ['label' => 'Delivery Photo', 'photo' => $delivery_photo ?? null]] as $pane)
        <div class="photo-card">
          <div class="photo-card-header">{{ $pane['label'] }}</div>
          @if($pane['photo'])
            <img src="{{ $pane['photo']['photo_url'] }}" alt="{{ $pane['label'] }}" />
            <div class="photo-meta">
              Taken: {{ \Carbon\Carbon::parse($pane['photo']['taken_at'])->format('d M Y, g:i A') }}<br>
              GPS: {{ number_format($pane['photo']['latitude'], 6) }}, {{ number_format($pane['photo']['longitude'], 6) }}
            </div>
          @else
            <div class="no-photo">No photo on record</div>
          @endif
        </div>
        @endforeach
      </div>
    </div>

    <!-- WhatsApp Confirmation -->
    @if($whatsapp_confirmation)
    <div class="section-title">WhatsApp Confirmation</div>
    <div class="wa-box">
      <div class="label">
        @if($whatsapp_confirmation['response'] === 'yes')
          ✓ Receipt Confirmed
        @else
          ✗ Receipt Disputed
        @endif
      </div>
      <p>
        Response received at {{ \Carbon\Carbon::parse($whatsapp_confirmation['received_at'])->format('d M Y, g:i A') }}
        from {{ $whatsapp_confirmation['from_phone'] ?? 'portal' }}
      </p>
    </div>
    @endif

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        <p style="font-weight:700; color:#111827;">{{ $organization }}</p>
        <p>Generated: {{ now()->format('d M Y, g:i A') }}</p>
        <p style="margin-top:4px;">This document is an official chain of custody record. Tampering is prohibited.</p>
        <p style="margin-top:2px; color:#10b981; font-weight:600;">HIPAA-Compliant • Immutable Record</p>
      </div>
      <div class="footer-right">
        <div class="seal">RouteHealth Verified</div>
      </div>
    </div>

  </div>
</body>
</html>
