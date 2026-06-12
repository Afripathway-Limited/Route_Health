// ─── Shared lightweight types ──────────────────────────────────────────────────

export interface AllRider {
  id: number;
  name: string;
  vehicle_type: string;
  availability_status: 'free' | 'on_route' | 'busy' | 'unavailable';
  coverage_lat: number | null;
  coverage_lng: number | null;
  coverage_city: string | null;
  is_active: boolean;
}

// ─── Auth & Users ──────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'org_admin' | 'dispatcher' | 'lab_manager' | 'rider';

export interface Organization {
  id: number;
  name: string;
  country: string;
  logo_url: string | null;
  primary_color: string;
  subdomain: string | null;
  status: 'active' | 'suspended';
  subscription_plan: 'starter' | 'professional' | 'enterprise';
  service_city?: string | null;
  service_lat?: number | null;
  service_lng?: number | null;
  service_radius_km?: number | null;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  roles: UserRole[];
  permissions: string[];
  is_active: boolean;
  last_login_at: string | null;
  requires_password_change: boolean;
  organization: Organization | null;
}

// ─── Facilities ────────────────────────────────────────────────────────────────

export type FacilityType = 'lab' | 'clinic' | 'hospital' | 'pharmacy';

export interface Facility {
  id: number;
  name: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  facility_type: FacilityType;
  contact_name: string;
  contact_phone: string;
  special_notes: string | null;
  is_active: boolean;
  pickups_this_month: number;
  created_at: string;
}

// ─── Riders ────────────────────────────────────────────────────────────────────

export type VehicleType = 'motorbike' | 'bicycle' | 'car' | 'van';

export interface Rider {
  id: number;
  name: string;
  phone: string;
  vehicle_type: VehicleType;
  home_facility: { id: number; name: string; city: string } | null;
  home_facility_id: number | null;
  photo_url: string | null;
  notes: string | null;
  is_active: boolean;
  availability_status: 'free' | 'busy' | 'on_route';
  coverage_lat: number | null;
  coverage_lng: number | null;
  coverage_radius_km: number;
  coverage_city: string | null;
  current_status: 'available' | 'on_route' | 'inactive';
  tasks_this_month: number;
  on_time_rate: number;
  created_at: string;
}

// ─── Tasks ─────────────────────────────────────────────────────────────────────

export type TaskType = 'pickup' | 'delivery';
export type TaskPriority = 'normal' | 'standard' | 'high' | 'urgent';
export type TaskStatus = 'planned' | 'assigned' | 'in_progress' | 'completed' | 'failed' | 'disputed';

export interface Task {
  id: number;
  short_id: string;
  facility: {
    id: number;
    name: string;
    city: string;
    latitude: number;
    longitude: number;
    contact_phone: string;
    facility_type: FacilityType;
  } | null;
  type: TaskType;
  scheduled_date: string;
  time_window_start: string;
  time_window_end: string;
  time_window_display: string;
  priority: TaskPriority;
  status: TaskStatus;
  notes: string | null;
  route_id: number | null;
  assigned_rider: { id: number; name: string } | null;
  created_at: string;
}

// ─── Routes ────────────────────────────────────────────────────────────────────

export type RouteStatus = 'planned' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type StopStatus = 'pending' | 'arrived' | 'photo_taken' | 'collected' | 'delivered' | 'failed' | 'disputed' | 'confirmed_delivered';

export interface CustodyPhoto {
  url: string;
  thumbnail_url: string | null;
  taken_at: string;
  latitude: number;
  longitude: number;
}

export interface RouteStop {
  id: number;
  sequence: number;
  task_id: number;
  facility: {
    id: number;
    name: string;
    city: string;
    latitude: number;
    longitude: number;
    contact_phone: string;
    special_notes: string | null;
    facility_type: FacilityType;
  } | null;
  status: StopStatus;
  planned_arrival: string;
  actual_arrival: string | null;
  delay_minutes: number | null;
  fail_reason: string | null;
  fail_notes: string | null;
  whatsapp_sent: boolean;
  pickup_photo: CustodyPhoto | null;
  delivery_photo: CustodyPhoto | null;
  whatsapp_confirmation: {
    response: 'yes' | 'no';
    received_at: string;
  } | null;
}

export interface Route {
  id: number;
  rider: {
    id: number;
    name: string;
    photo_url: string | null;
    vehicle_type: VehicleType;
  } | null;
  date: string;
  status: RouteStatus;
  total_stops: number;
  completed_stops: number;
  completion_rate: number;
  total_distance_km: string | null;
  planned_start_time: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  created_at: string;
}

export interface RouteDetail extends Route {
  depot_latitude: number;
  depot_longitude: number;
  stops: RouteStop[];
  driver_locations: Array<{
    latitude: number;
    longitude: number;
    recorded_at: string;
  }>;
}

// ─── Optimization ──────────────────────────────────────────────────────────────

export interface OptimizedStop {
  sequence: number;
  task_id: number;
  facility_id: number;
  facility_name: string;
  facility_city: string;
  facility_type: FacilityType;
  latitude: number;
  longitude: number;
  planned_arrival: string;
  planned_departure: string;
  time_window_start: string;
  time_window_end: string;
  priority: TaskPriority;
  type: TaskType;
  distance_from_prev_km: number;
  travel_minutes: number;
  eta_ai_adjusted: boolean;
  eta_adjustment_minutes: number;
  notes: string | null;
}

export interface OptimizedRiderRoute {
  rider_id: number;
  rider_name: string;
  rider_photo: string | null;
  vehicle_type: VehicleType;
  stops: OptimizedStop[];
  total_distance_km: number;
  estimated_duration_minutes: number;
}

export interface OptimizationResult {
  riders: OptimizedRiderRoute[];
  optimization_time_ms: number;
  tasks_assigned: number;
  tasks_unassigned: number;
}

// ─── Live Tracking ─────────────────────────────────────────────────────────────

export interface LiveRider {
  route_id: number;
  rider: {
    id: number;
    name: string;
    phone: string;
    photo_url: string | null;
    vehicle_type: VehicleType;
  };
  status: RouteStatus;
  total_stops: number;
  completed_stops: number;
  completion_percentage: number;
  current_stop: RouteStop | null;
  next_stop: RouteStop | null;
  latest_location: {
    latitude: number;
    longitude: number;
    recorded_at: string;
  } | null;
  has_disputes: boolean;
  eta_next_stop: string | null;
}

// ─── Anomalies ─────────────────────────────────────────────────────────────────

export type AlertType = 'stationary_too_long' | 'route_deviation' | 'overdue_stop' | 'sample_delay' | 'rider_offline';

export interface AnomalyAlert {
  id: number;
  alert_type: AlertType;
  description: string;
  severity: 'warning' | 'critical';
  rider_name: string | null;
  route_id: number | null;
  triggered_at: string;
  is_dismissed: boolean;
}

// ─── Analytics ─────────────────────────────────────────────────────────────────

export interface DailyStat {
  date: string;
  day_label: string;
  completed: number;
  failed: number;
  disputed: number;
  total: number;
  routes_created?: number;
}

export interface AnalyticsSummary {
  total_routes: number;
  completed_routes: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  disputed_tasks: number;
  completion_rate: number;
  avg_delay_minutes: number;
  dispute_rate: number;
  total_distance_km: number;
}

// ─── Organization (Extended) ───────────────────────────────────────────────────

export interface OrganizationDetail extends Organization {
  max_riders: number;
  max_facilities: number;
  max_tasks_per_month: number;
  admin_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  rider_count: number;
  user_count: number;
  facility_count: number;
  tasks_this_month: number;
  created_at: string;
}

// ─── Lab Manager ───────────────────────────────────────────────────────────────

export interface LabPickup {
  id: number;
  facility: { id: number; name: string; city: string } | null;
  rider: { id: number; name: string; photo_url: string | null; phone: string } | null;
  status: StopStatus;
  planned_arrival: string;
  actual_arrival: string | null;
  task_type: TaskType | null;
  task_notes: string | null;
  has_photos: boolean;
  can_confirm: boolean;
  confirmation: { response: 'yes' | 'no'; received_at: string } | null;
}

// ─── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors?: Record<string, string[]>;
  meta?: {
    pagination?: {
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
    };
  };
}
