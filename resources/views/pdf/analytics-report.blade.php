<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>RouteHealth Analytics Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1F2937; background: #fff; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10B981; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-box { width: 32px; height: 32px; background: #10B981; border-radius: 6px; }
    .logo-name { font-size: 18px; font-weight: 700; color: #0A0F1E; }
    .logo-name span { color: #10B981; }
    .header-right { text-align: right; }
    .report-title { font-size: 20px; font-weight: 700; color: #0A0F1E; margin-bottom: 4px; }
    .report-meta { font-size: 11px; color: #6B7280; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 700; color: #0A0F1E; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 8px; }
    .kpi-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 16px; }
    .kpi-label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .kpi-value { font-size: 20px; font-weight: 700; color: #10B981; }
    .kpi-unit { font-size: 11px; color: #9CA3AF; margin-left: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #F3F4F6; color: #374151; font-weight: 600; padding: 8px 10px; text-align: left; border-bottom: 1px solid #E5E7EB; }
    td { padding: 7px 10px; border-bottom: 1px solid #F3F4F6; color: #4B5563; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #FAFAFA; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
    .badge-green { background: #ECFDF5; color: #059669; }
    .badge-red { background: #FEF2F2; color: #DC2626; }
    .badge-yellow { background: #FFFBEB; color: #D97706; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #9CA3AF; text-align: center; }
    .org-logo { max-height: 40px; margin-bottom: 4px; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="logo">
      @if(!empty($org->logo_url))
        <img src="{{ $org->logo_url }}" class="org-logo" alt="{{ $org->name }}" />
      @else
        <div class="logo-box"></div>
      @endif
      <div class="logo-name">Route<span>Health</span></div>
    </div>
    <div class="header-right">
      <div class="report-title">Analytics Report</div>
      <div class="report-meta">{{ $org->name }} · {{ $from }} to {{ $to }}</div>
      <div class="report-meta" style="color: #9CA3AF; margin-top: 2px;">Generated {{ now()->format('M j, Y g:i A') }}</div>
    </div>
  </div>

  <!-- Summary KPIs -->
  <div class="section">
    <div class="section-title">Performance Summary</div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Routes</div>
        <div class="kpi-value">{{ $summary['total_routes'] ?? 0 }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Tasks</div>
        <div class="kpi-value">{{ $summary['total_tasks'] ?? 0 }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Completion Rate</div>
        <div class="kpi-value">{{ $summary['completion_rate'] ?? 0 }}<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Avg Delay</div>
        <div class="kpi-value">{{ $summary['avg_delay_minutes'] ?? 0 }}<span class="kpi-unit">min</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Dispute Rate</div>
        <div class="kpi-value">{{ $summary['dispute_rate'] ?? 0 }}<span class="kpi-unit">%</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Distance</div>
        <div class="kpi-value">{{ $summary['total_distance_km'] ?? 0 }}<span class="kpi-unit">km</span></div>
      </div>
    </div>
  </div>

  <!-- Daily Breakdown -->
  <div class="section">
    <div class="section-title">Daily Performance</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>Completed</th>
          <th>Failed</th>
          <th>Disputed</th>
          <th>Total</th>
          <th>Routes Created</th>
        </tr>
      </thead>
      <tbody>
        @foreach($daily as $day)
        <tr>
          <td>{{ $day['date'] ?? '' }}</td>
          <td>{{ $day['day_label'] ?? '' }}</td>
          <td><span class="status-badge badge-green">{{ $day['completed'] ?? 0 }}</span></td>
          <td><span class="status-badge badge-red">{{ $day['failed'] ?? 0 }}</span></td>
          <td><span class="status-badge badge-yellow">{{ $day['disputed'] ?? 0 }}</span></td>
          <td>{{ $day['total'] ?? 0 }}</td>
          <td>{{ $day['routes_created'] ?? 0 }}</td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- Rider Performance -->
  <div class="section">
    <div class="section-title">Rider Performance</div>
    <table>
      <thead>
        <tr>
          <th>Rider Name</th>
          <th>Vehicle</th>
          <th>Routes</th>
          <th>Total Tasks</th>
          <th>On-Time Rate</th>
          <th>Avg Delay</th>
        </tr>
      </thead>
      <tbody>
        @foreach($riders as $rider)
        <tr>
          <td>{{ $rider['name'] ?? '' }}</td>
          <td>{{ ucfirst($rider['vehicle_type'] ?? '') }}</td>
          <td>{{ $rider['route_count'] ?? 0 }}</td>
          <td>{{ $rider['total_stops'] ?? 0 }}</td>
          <td>
            @php $rate = $rider['on_time_rate'] ?? 0; @endphp
            <span class="status-badge {{ $rate >= 80 ? 'badge-green' : ($rate >= 60 ? 'badge-yellow' : 'badge-red') }}">
              {{ $rate }}%
            </span>
          </td>
          <td>{{ $rider['avg_delay_minutes'] ?? 0 }} min</td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>

  <!-- Facility Performance -->
  <div class="section">
    <div class="section-title">Facility Performance</div>
    <table>
      <thead>
        <tr>
          <th>Facility</th>
          <th>City</th>
          <th>Type</th>
          <th>Pickups</th>
          <th>Avg Delay</th>
          <th>Disputes</th>
        </tr>
      </thead>
      <tbody>
        @foreach($facilities as $facility)
        <tr>
          <td>{{ $facility['name'] ?? '' }}</td>
          <td>{{ $facility['city'] ?? '' }}</td>
          <td>{{ ucfirst($facility['facility_type'] ?? '') }}</td>
          <td>{{ $facility['pickup_count'] ?? 0 }}</td>
          <td>{{ $facility['avg_delay_minutes'] ?? 0 }} min</td>
          <td>{{ $facility['dispute_count'] ?? 0 }}</td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Generated by RouteHealth on {{ now()->format('F j, Y') }} · HIPAA-compliant health logistics platform</p>
    <p style="margin-top: 4px;">This report is confidential and intended solely for {{ $org->name }}.</p>
  </div>

</body>
</html>
