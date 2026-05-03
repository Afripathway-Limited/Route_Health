// Phase 1 mock data — realistic African health logistics data.
// All dashboard pages consume this instead of API calls.
// Only auth + org branding call the real API.

export const MOCK_FACILITIES = [
  {
    id: 1,
    name: 'Aga Khan Hospital Nairobi',
    address_line_1: '3rd Parklands Avenue',
    address_line_2: 'Parklands',
    city: 'Nairobi',
    country: 'Kenya',
    latitude: -1.2634,
    longitude: 36.8172,
    facility_type: 'hospital',
    contact_name: 'Dr. Amina Osman',
    contact_phone: '+254 20 366 2000',
    special_notes: 'Main lab samples collected from Loading Bay B',
    is_active: true,
    pickups_this_month: 34,
  },
  {
    id: 2,
    name: 'Westlands Medical Centre',
    address_line_1: 'Westlands Road, Westlands Square',
    address_line_2: null,
    city: 'Nairobi',
    country: 'Kenya',
    latitude: -1.2639,
    longitude: 36.8072,
    facility_type: 'clinic',
    contact_name: 'Nurse Grace Mwenda',
    contact_phone: '+254 722 445 601',
    special_notes: 'Security gate requires badge scan after 17:00',
    is_active: true,
    pickups_this_month: 28,
  },
  {
    id: 3,
    name: 'Kenyatta National Hospital',
    address_line_1: 'Hospital Road, Upper Hill',
    address_line_2: null,
    city: 'Nairobi',
    country: 'Kenya',
    latitude: -1.3011,
    longitude: 36.8063,
    facility_type: 'hospital',
    contact_name: 'Mr. John Ochieng',
    contact_phone: '+254 20 272 6300',
    special_notes: 'Outpatient lab — enter via Gate 4',
    is_active: true,
    pickups_this_month: 41,
  },
  {
    id: 4,
    name: 'MP Shah Hospital',
    address_line_1: 'Shivachi Road, Parklands',
    address_line_2: null,
    city: 'Nairobi',
    country: 'Kenya',
    latitude: -1.2709,
    longitude: 36.8204,
    facility_type: 'hospital',
    contact_name: 'Lab Manager Sunita Patel',
    contact_phone: '+254 20 424 2000',
    special_notes: null,
    is_active: true,
    pickups_this_month: 22,
  },
  {
    id: 5,
    name: 'Karen Hospital',
    address_line_1: 'Karen Road, Karen',
    address_line_2: null,
    city: 'Nairobi',
    country: 'Kenya',
    latitude: -1.3289,
    longitude: 36.7116,
    facility_type: 'hospital',
    contact_name: 'Dr. Patrick Mwangi',
    contact_phone: '+254 20 661 3000',
    special_notes: 'Sample cooler must be returned same day',
    is_active: true,
    pickups_this_month: 17,
  },
  {
    id: 6,
    name: "Gertrude's Children Hospital",
    address_line_1: 'Muthaiga Road',
    address_line_2: null,
    city: 'Nairobi',
    country: 'Kenya',
    latitude: -1.2498,
    longitude: 36.8366,
    facility_type: 'hospital',
    contact_name: 'Sr. Mary Wambui',
    contact_phone: '+254 20 720 4444',
    special_notes: 'Paediatric samples require special handling',
    is_active: true,
    pickups_this_month: 12,
  },
  {
    id: 7,
    name: 'Eastleigh Clinic',
    address_line_1: '2nd Avenue, Eastleigh',
    address_line_2: null,
    city: 'Nairobi',
    country: 'Kenya',
    latitude: -1.2715,
    longitude: 36.8508,
    facility_type: 'clinic',
    contact_name: 'Dr. Hussein Ali',
    contact_phone: '+254 733 210 445',
    special_notes: null,
    is_active: true,
    pickups_this_month: 19,
  },
  {
    id: 8,
    name: 'Kibera Community Health Centre',
    address_line_1: 'Olympic Estate, Kibera',
    address_line_2: null,
    city: 'Nairobi',
    country: 'Kenya',
    latitude: -1.3127,
    longitude: 36.7844,
    facility_type: 'clinic',
    contact_name: 'Nurse Faith Akinyi',
    contact_phone: '+254 712 883 220',
    special_notes: 'Collection window: 07:30 – 10:00 only',
    is_active: true,
    pickups_this_month: 9,
  },
] as const;

export const MOCK_RIDERS = [
  {
    id: 1,
    name: 'David Kamau',
    phone: '+254 722 113 456',
    vehicle_type: 'motorbike',
    home_facility: { id: 1, name: 'Aga Khan Hospital Nairobi', city: 'Nairobi' },
    photo_url: null,
    is_active: true,
    current_status: 'on_route' as const,
    tasks_this_month: 87,
    on_time_rate: 94,
    avg_delay_minutes: 4,
  },
  {
    id: 2,
    name: 'Sarah Wanjiku',
    phone: '+254 733 228 901',
    vehicle_type: 'bicycle',
    home_facility: { id: 2, name: 'Westlands Medical Centre', city: 'Nairobi' },
    photo_url: null,
    is_active: true,
    current_status: 'available' as const,
    tasks_this_month: 62,
    on_time_rate: 88,
    avg_delay_minutes: 9,
  },
  {
    id: 3,
    name: 'James Otieno',
    phone: '+254 700 556 712',
    vehicle_type: 'motorbike',
    home_facility: { id: 3, name: 'Kenyatta National Hospital', city: 'Nairobi' },
    photo_url: null,
    is_active: true,
    current_status: 'on_route' as const,
    tasks_this_month: 74,
    on_time_rate: 78,
    avg_delay_minutes: 18,
  },
  {
    id: 4,
    name: 'Grace Achieng',
    phone: '+254 711 334 887',
    vehicle_type: 'car',
    home_facility: { id: 5, name: 'Karen Hospital', city: 'Nairobi' },
    photo_url: null,
    is_active: true,
    current_status: 'on_route' as const,
    tasks_this_month: 51,
    on_time_rate: 96,
    avg_delay_minutes: 2,
  },
  {
    id: 5,
    name: 'Peter Njoroge',
    phone: '+254 726 991 003',
    vehicle_type: 'motorbike',
    home_facility: { id: 7, name: 'Eastleigh Clinic', city: 'Nairobi' },
    photo_url: null,
    is_active: false,
    current_status: 'inactive' as const,
    tasks_this_month: 38,
    on_time_rate: 72,
    avg_delay_minutes: 23,
  },
] as const;

export const MOCK_TASKS = [
  { id: 1001, facility: MOCK_FACILITIES[0], type: 'pickup', scheduled_date: 'Today', time_window_start: '08:00', time_window_end: '10:00', time_window_display: '08:00 – 10:00', priority: 'urgent', status: 'in_progress', rider: MOCK_RIDERS[0] },
  { id: 1002, facility: MOCK_FACILITIES[1], type: 'pickup', scheduled_date: 'Today', time_window_start: '08:30', time_window_end: '10:30', time_window_display: '08:30 – 10:30', priority: 'standard', status: 'completed', rider: MOCK_RIDERS[0] },
  { id: 1003, facility: MOCK_FACILITIES[2], type: 'delivery', scheduled_date: 'Today', time_window_start: '09:00', time_window_end: '11:00', time_window_display: '09:00 – 11:00', priority: 'urgent', status: 'assigned', rider: MOCK_RIDERS[2] },
  { id: 1004, facility: MOCK_FACILITIES[3], type: 'pickup', scheduled_date: 'Today', time_window_start: '10:00', time_window_end: '12:00', time_window_display: '10:00 – 12:00', priority: 'standard', status: 'planned', rider: null },
  { id: 1005, facility: MOCK_FACILITIES[4], type: 'pickup', scheduled_date: 'Today', time_window_start: '10:30', time_window_end: '12:30', time_window_display: '10:30 – 12:30', priority: 'standard', status: 'in_progress', rider: MOCK_RIDERS[3] },
  { id: 1006, facility: MOCK_FACILITIES[5], type: 'delivery', scheduled_date: 'Today', time_window_start: '11:00', time_window_end: '13:00', time_window_display: '11:00 – 13:00', priority: 'standard', status: 'assigned', rider: MOCK_RIDERS[1] },
  { id: 1007, facility: MOCK_FACILITIES[6], type: 'pickup', scheduled_date: 'Today', time_window_start: '12:00', time_window_end: '14:00', time_window_display: '12:00 – 14:00', priority: 'standard', status: 'planned', rider: null },
  { id: 1008, facility: MOCK_FACILITIES[7], type: 'pickup', scheduled_date: 'Today', time_window_start: '07:30', time_window_end: '09:30', time_window_display: '07:30 – 09:30', priority: 'urgent', status: 'completed', rider: MOCK_RIDERS[2] },
  { id: 1009, facility: MOCK_FACILITIES[0], type: 'delivery', scheduled_date: 'Today', time_window_start: '14:00', time_window_end: '16:00', time_window_display: '14:00 – 16:00', priority: 'standard', status: 'planned', rider: null },
  { id: 1010, facility: MOCK_FACILITIES[2], type: 'pickup', scheduled_date: 'Today', time_window_start: '14:00', time_window_end: '16:00', time_window_display: '14:00 – 16:00', priority: 'urgent', status: 'failed', rider: MOCK_RIDERS[3] },
];

export const MOCK_ROUTES = [
  {
    id: 201,
    rider: MOCK_RIDERS[0],
    date: 'Today',
    status: 'in_progress',
    color: '#4F6EF7',
    total_stops: 7,
    completed_stops: 4,
    total_distance_km: 22.3,
    stops: [
      { sequence: 1, facility: MOCK_FACILITIES[7], status: 'collected', planned_arrival: '07:45', actual_arrival: '07:42', delay_minutes: -3 },
      { sequence: 2, facility: MOCK_FACILITIES[1], status: 'collected', planned_arrival: '08:30', actual_arrival: '08:37', delay_minutes: 7 },
      { sequence: 3, facility: MOCK_FACILITIES[0], status: 'in_progress', planned_arrival: '09:15', actual_arrival: null, delay_minutes: null },
      { sequence: 4, facility: MOCK_FACILITIES[3], status: 'pending', planned_arrival: '10:00', actual_arrival: null, delay_minutes: null },
      { sequence: 5, facility: MOCK_FACILITIES[5], status: 'pending', planned_arrival: '11:00', actual_arrival: null, delay_minutes: null },
      { sequence: 6, facility: MOCK_FACILITIES[6], status: 'pending', planned_arrival: '12:00', actual_arrival: null, delay_minutes: null },
      { sequence: 7, facility: MOCK_FACILITIES[3], status: 'pending', planned_arrival: '13:30', actual_arrival: null, delay_minutes: null },
    ],
  },
  {
    id: 202,
    rider: MOCK_RIDERS[2],
    date: 'Today',
    status: 'in_progress',
    color: '#059669',
    total_stops: 6,
    completed_stops: 3,
    total_distance_km: 18.7,
    stops: [
      { sequence: 1, facility: MOCK_FACILITIES[7], status: 'collected', planned_arrival: '08:00', actual_arrival: '08:05', delay_minutes: 5 },
      { sequence: 2, facility: MOCK_FACILITIES[2], status: 'collected', planned_arrival: '09:00', actual_arrival: '09:08', delay_minutes: 8 },
      { sequence: 3, facility: MOCK_FACILITIES[6], status: 'failed', planned_arrival: '10:00', actual_arrival: '10:42', delay_minutes: 42 },
      { sequence: 4, facility: MOCK_FACILITIES[4], status: 'pending', planned_arrival: '11:30', actual_arrival: null, delay_minutes: null },
      { sequence: 5, facility: MOCK_FACILITIES[0], status: 'pending', planned_arrival: '13:00', actual_arrival: null, delay_minutes: null },
      { sequence: 6, facility: MOCK_FACILITIES[1], status: 'pending', planned_arrival: '14:30', actual_arrival: null, delay_minutes: null },
    ],
  },
  {
    id: 203,
    rider: MOCK_RIDERS[3],
    date: 'Today',
    status: 'in_progress',
    color: '#D97706',
    total_stops: 5,
    completed_stops: 2,
    total_distance_km: 31.2,
    stops: [
      { sequence: 1, facility: MOCK_FACILITIES[4], status: 'collected', planned_arrival: '09:30', actual_arrival: '09:28', delay_minutes: -2 },
      { sequence: 2, facility: MOCK_FACILITIES[2], status: 'collected', planned_arrival: '10:30', actual_arrival: '10:31', delay_minutes: 1 },
      { sequence: 3, facility: MOCK_FACILITIES[0], status: 'pending', planned_arrival: '12:00', actual_arrival: null, delay_minutes: null },
      { sequence: 4, facility: MOCK_FACILITIES[3], status: 'pending', planned_arrival: '13:30', actual_arrival: null, delay_minutes: null },
      { sequence: 5, facility: MOCK_FACILITIES[5], status: 'pending', planned_arrival: '15:00', actual_arrival: null, delay_minutes: null },
    ],
  },
];

export const MOCK_ANALYTICS = {
  summary: {
    total_routes: 3,
    completed_routes: 0,
    total_tasks: 10,
    completed_tasks: 6,
    failed_tasks: 1,
    disputed_tasks: 0,
    completion_rate: 94.2,
    avg_delay_minutes: 8,
    dispute_rate: 0,
    total_distance_km: 72.2,
  },
  weekly_chart: [
    { date: '2026-04-22', day_label: 'Mon', completed: 11, failed: 0 },
    { date: '2026-04-23', day_label: 'Tue', completed: 9,  failed: 1 },
    { date: '2026-04-24', day_label: 'Wed', completed: 14, failed: 0 },
    { date: '2026-04-25', day_label: 'Thu', completed: 8,  failed: 2 },
    { date: '2026-04-26', day_label: 'Fri', completed: 12, failed: 0 },
    { date: '2026-04-27', day_label: 'Sat', completed: 6,  failed: 0 },
    { date: '2026-04-28', day_label: 'Today', completed: 6,  failed: 1 },
  ],
  rider_performance: [
    { id: 4, name: 'Grace Achieng',  on_time_rate: 96, total_stops: 51, avg_delay: 2 },
    { id: 1, name: 'David Kamau',    on_time_rate: 94, total_stops: 87, avg_delay: 4 },
    { id: 2, name: 'Sarah Wanjiku',  on_time_rate: 88, total_stops: 62, avg_delay: 9 },
    { id: 3, name: 'James Otieno',   on_time_rate: 78, total_stops: 74, avg_delay: 18 },
    { id: 5, name: 'Peter Njoroge',  on_time_rate: 72, total_stops: 38, avg_delay: 23 },
  ],
  delayed_facilities: [
    { id: 3, name: 'Kenyatta National Hospital', avg_delay: 22, pickups: 41 },
    { id: 7, name: 'Eastleigh Clinic',           avg_delay: 17, pickups: 19 },
    { id: 8, name: 'Kibera Community Health',     avg_delay: 14, pickups: 9 },
  ],
};

export const MOCK_USERS = [
  { id: 1, name: 'James Kariuki', email: 'james@pathcare.ke', role: 'org_admin', is_active: true, last_login_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 2, name: 'Mary Wanjiku',  email: 'mary@pathcare.ke',  role: 'dispatcher', is_active: true, last_login_at: new Date(Date.now() - 4 * 3600000).toISOString() },
  { id: 3, name: 'Lab Reception', email: 'lab@nairobi-general.ke', role: 'lab_manager', is_active: true, last_login_at: new Date(Date.now() - 24 * 3600000).toISOString() },
];

export const MOCK_ADMIN_DASHBOARD = {
  total_tasks_today: 10,
  routes_dispatched: 3,
  routes_completed: 0,
  routes_in_progress: 3,
  failed_stops: 1,
  disputed_deliveries: 0,
};

export const MOCK_DISPATCHER_DASHBOARD = {
  pending_tasks: 3,
  tasks_assigned_today: 7,
  routes_in_progress: 3,
  routes_completed_today: 0,
  overdue_stops: 1,
  failed_stops_today: 1,
  active_alerts: 1,
};

export const MOCK_ALERTS = [
  {
    id: 1,
    alert_type: 'overdue_stop',
    severity: 'warning',
    description: 'Stop at Westlands Medical Centre is 35 minutes overdue. Rider has not marked arrival.',
    rider: MOCK_RIDERS[1],
    route_id: 202,
    triggered_at: new Date(Date.now() - 35 * 60000).toISOString(),
    is_dismissed: false,
  },
];

export const MOCK_LAB_PICKUPS = [
  { id: 301, facility: MOCK_FACILITIES[0], rider: MOCK_RIDERS[0], eta: '09:45', sample_description: 'Blood panel — 3 tubes (EDTA, SST)', status: 'in_transit', can_confirm: false },
  { id: 302, facility: MOCK_FACILITIES[1], rider: MOCK_RIDERS[1], eta: '10:30', sample_description: 'Urine culture — refrigerated', status: 'in_transit', can_confirm: false },
  { id: 303, facility: MOCK_FACILITIES[3], rider: MOCK_RIDERS[3], eta: '11:15', sample_description: 'Histology — formalin fixed', status: 'arrived', can_confirm: true },
  { id: 304, facility: MOCK_FACILITIES[4], rider: MOCK_RIDERS[0], eta: '13:00', sample_description: 'PCR swab — viral transport', status: 'confirmed', can_confirm: false },
  { id: 305, facility: MOCK_FACILITIES[5], rider: MOCK_RIDERS[2], eta: '14:30', sample_description: 'CBC + lipid panel', status: 'confirmed', can_confirm: false },
];

export const MOCK_LAB_HISTORY = [
  { id: 401, date: '2026-04-28', time: '08:42', rider: MOCK_RIDERS[0], facility: MOCK_FACILITIES[7], status: 'confirmed', has_photos: true },
  { id: 402, date: '2026-04-28', time: '09:18', rider: MOCK_RIDERS[1], facility: MOCK_FACILITIES[1], status: 'confirmed', has_photos: true },
  { id: 403, date: '2026-04-27', time: '10:05', rider: MOCK_RIDERS[2], facility: MOCK_FACILITIES[2], status: 'failed', has_photos: false },
  { id: 404, date: '2026-04-27', time: '11:22', rider: MOCK_RIDERS[3], facility: MOCK_FACILITIES[4], status: 'confirmed', has_photos: true },
  { id: 405, date: '2026-04-26', time: '08:55', rider: MOCK_RIDERS[0], facility: MOCK_FACILITIES[0], status: 'confirmed', has_photos: true },
  { id: 406, date: '2026-04-26', time: '12:30', rider: MOCK_RIDERS[1], facility: MOCK_FACILITIES[3], status: 'confirmed', has_photos: true },
  { id: 407, date: '2026-04-25', time: '09:10', rider: MOCK_RIDERS[2], facility: MOCK_FACILITIES[6], status: 'disputed', has_photos: false },
  { id: 408, date: '2026-04-25', time: '14:00', rider: MOCK_RIDERS[3], facility: MOCK_FACILITIES[5], status: 'confirmed', has_photos: true },
];

// Rider positions for live tracking (Nairobi coordinates)
export const MOCK_RIDER_POSITIONS = [
  { rider_id: 1, lat: -1.2703, lng: 36.8121, heading: 45,  route_id: 201 },
  { rider_id: 3, lat: -1.2849, lng: 36.8244, heading: 220, route_id: 202 },
  { rider_id: 4, lat: -1.3142, lng: 36.7901, heading: 90,  route_id: 203 },
];

// ── Compatibility shims — pages use flat IDs ───────────────────────────────

// MOCK_ANALYTICS with page-compatible field names
export const MOCK_ANALYTICS_COMPAT = {
  ...MOCK_ANALYTICS,
  weekly: MOCK_ANALYTICS.weekly_chart,
  riderPerformance: MOCK_ANALYTICS.rider_performance.map(r => ({
    ...r,
    tasks_completed: r.total_stops,
  })),
};

// Re-export MOCK_ANALYTICS with aliases so pages can import { MOCK_ANALYTICS } and use .weekly / .riderPerformance
Object.assign(MOCK_ANALYTICS, {
  weekly: MOCK_ANALYTICS.weekly_chart,
  riderPerformance: MOCK_ANALYTICS.rider_performance.map((r: any) => ({ ...r, tasks_completed: r.total_stops })),
});

// MOCK_RIDERS normalized with flat fields pages expect
export const MOCK_RIDERS_NORM = MOCK_RIDERS.map(r => ({
  ...r,
  status: r.current_status,
  home_facility_id: r.home_facility?.id ?? null,
  tasks_this_month: r.tasks_this_month,
  organization_id: 1,
}));

// MOCK_TASKS normalized with flat facility_id and rider_name
export const MOCK_TASKS_NORM = MOCK_TASKS.map(t => ({
  ...t,
  facility_id: t.facility.id,
  rider_id: t.rider?.id ?? null,
  rider_name: t.rider?.name ?? null,
  organization_id: 1,
  route_id: null,
}));

// MOCK_ROUTES normalized with rider_id and stops with facility_id + id
export const MOCK_ROUTES_NORM = MOCK_ROUTES.map(route => ({
  ...route,
  rider_id: route.rider.id,
  rider_name: route.rider.name,
  stops: route.stops.map((stop, i) => ({
    ...stop,
    id: route.id * 100 + i + 1,
    facility_id: stop.facility.id,
    facility_name: stop.facility.name,
  })),
}));

// ── Super Admin mock data ──────────────────────────────────────────────────

export const MOCK_ORGANIZATIONS = [
  {
    id: 1,
    name: 'PathCare Diagnostics Kenya',
    country: 'Kenya',
    admin_name: 'James Kariuki',
    admin_email: 'james@pathcare.ke',
    rider_count: 5,
    tasks_this_month: 217,
    subscription_plan: 'professional',
    status: 'active',
    created_at: '2025-11-12',
  },
  {
    id: 2,
    name: 'LifeLab Tanzania',
    country: 'Tanzania',
    admin_name: 'Amina Juma',
    admin_email: 'amina@lifelab.tz',
    rider_count: 8,
    tasks_this_month: 344,
    subscription_plan: 'enterprise',
    status: 'active',
    created_at: '2025-09-03',
  },
  {
    id: 3,
    name: 'MedExpress Uganda',
    country: 'Uganda',
    admin_name: 'Robert Okello',
    admin_email: 'robert@medexpress.ug',
    rider_count: 3,
    tasks_this_month: 89,
    subscription_plan: 'starter',
    status: 'active',
    created_at: '2026-01-20',
  },
  {
    id: 4,
    name: 'SaniLab Rwanda',
    country: 'Rwanda',
    admin_name: 'Marie Uwase',
    admin_email: 'marie@sanilab.rw',
    rider_count: 2,
    tasks_this_month: 0,
    subscription_plan: 'starter',
    status: 'suspended',
    created_at: '2026-03-07',
  },
];

export const MOCK_PLATFORM_STATS = {
  active_organizations: 3,
  total_organizations: 4,
  suspended_organizations: 1,
  total_riders_today: 16,
  tasks_processed_today: 41,
  platform_uptime: '99.98%',
};
