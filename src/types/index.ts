export type UserRole = 'customer' | 'shop_owner';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  created_at: string;
}

export interface ShopPricing {
  id: string;
  shop_id: string;
  black_white_price: number; // e.g. 1.50 per page
  color_price: number;       // e.g. 8.00 per page
  double_sided_discount: number; // e.g. 0.25 off per side
  binding_price: number;     // spiral: e.g. 35.00
  stapling_price: number;    // stapling: e.g. 5.00
  lamination_price: number;  // e.g. 20.00
  paper_size_multipliers: {
    A4: number;
    A3: number;
    Letter: number;
  };
}

export interface Shop {
  id: string;
  owner_id: string;
  shop_name: string;
  tagline: string;
  address: string;
  distance: string; // e.g. "0.3 km"
  latitude: number;
  longitude: number;
  phone: string;
  opening_hours: string;
  is_active: boolean;
  rating: number;
  review_count: number;
  avg_turnaround_mins: number;
  current_queue_orders: number;
  services: string[];
  banner_color: string;
  accepting_orders: boolean;
  created_at: string;
}

export type OrderStatus = 
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'printing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type PaperSize = 'A4' | 'A3' | 'Letter';
export type ColorMode = 'bw' | 'color';
export type Sides = 'single' | 'double';
export type Orientation = 'portrait' | 'landscape';
export type BindingType = 'none' | 'spiral' | 'stapling' | 'hardcover';

export interface OrderDocument {
  id: string;
  customer_id: string;
  order_id?: string;
  file_name: string;
  file_size: number; // in bytes
  page_count: number;
  file_url: string; // data URL or blob URL
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  shop_id: string;
  shop_name: string;
  status: OrderStatus;
  
  // Printing configurations
  document: OrderDocument;
  copies: number;
  color_mode: ColorMode;
  paper_size: PaperSize;
  sides: Sides;
  orientation: Orientation;
  page_range: string; // e.g. "all" or "1-10, 14"
  binding_type: BindingType;
  lamination: boolean;
  special_instructions?: string;

  // Financials
  total_pages_to_print: number;
  cost_breakdown: {
    paper_and_print: number;
    binding: number;
    finishing: number;
    taxes: number;
  };
  total_price: number;

  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  estimated_pickup_time?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  order_id?: string;
  title: string;
  message: string;
  is_read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
  created_at: string;
}

export interface DailyShopStats {
  today_revenue: number;
  today_orders_count: number;
  active_queue_count: number;
  completed_today: number;
  average_print_time_mins: number;
}

