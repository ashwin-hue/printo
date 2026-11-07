/**
 * Printo Database Types (PostgreSQL / Hasura / Nhost)
 * Matches the 15 tables created by nhost/schema.sql
 */

export type UserRole = 'customer' | 'shop_owner' | 'admin';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'printing'
  | 'ready_for_collection'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// 1. profiles
export interface Profile {
  id: string; // references auth.users(id)
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// 2. shops
export interface Shop {
  id: string;
  owner_id: string;
  shop_name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  operating_hours?: ShopOperatingHours[];
  services?: ShopService[];
  pricing?: ShopPricing[];
}

// 3. shop_operating_hours
export interface ShopOperatingHours {
  id: string;
  shop_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  opening_time: string | null;
  closing_time: string | null;
  is_closed: boolean;
}

// 4. shop_services
export interface ShopService {
  id: string;
  shop_id: string;
  service_name: string;
  description: string | null;
  is_available: boolean;
}

// 5. shop_pricing
export interface ShopPricing {
  id: string;
  shop_id: string;
  service_type: string;
  paper_size: string;
  color_mode: string;
  sides: string;
  price_per_page: number;
  created_at: string;
  updated_at: string;
}

// 6. documents
export interface Document {
  id: string;
  customer_id: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  page_count: number;
  created_at: string;
}

// 7. orders
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  shop_id: string;
  status: OrderStatus;
  total_pages: number;
  total_copies: number;
  subtotal: number;
  total_amount: number;
  customer_notes: string | null;
  estimated_completion: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  shop?: Shop;
  customer?: Profile;
  order_documents?: OrderDocument[];
  payments?: Payment[];
}

// 8. order_documents
export interface OrderDocument {
  id: string;
  order_id: string;
  document_id: string;
  copies: number;
  page_range: string | null;
  color_mode: string;
  paper_size: string;
  sides: string;
  orientation: string;
  binding_type: string;
  price: number;
  document?: Document;
}

// 9. order_status_history
export interface OrderStatusHistory {
  id: string;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

// 10. notifications
export interface Notification {
  id: string;
  user_id: string;
  order_id: string | null;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

// 11. payments
export interface Payment {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  payment_status: PaymentStatus;
  transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
}

// 12. shop_staff
export interface ShopStaff {
  id: string;
  shop_id: string;
  user_id: string;
  designation: string | null;
  is_active: boolean;
  created_at: string;
  user?: Profile;
}

// 13. reviews
export interface Review {
  id: string;
  customer_id: string;
  shop_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer?: Profile;
}

// 14. support_tickets
export interface SupportTicket {
  id: string;
  user_id: string;
  order_id: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string | null;
}

// 15. document_access_logs
export interface DocumentAccessLog {
  id: string;
  document_id: string;
  accessed_by: string | null;
  shop_id: string | null;
  action: string;
  accessed_at: string;
}

