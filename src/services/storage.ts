import { 
  User, 
  Shop, 
  ShopPricing, 
  Order, 
  OrderDocument, 
  NotificationItem, 
  DailyShopStats,
  OrderStatus
} from '../types';

const STORAGE_KEYS = {
  CURRENT_USER: 'printo_current_user',
  USERS: 'printo_users',
  SHOPS: 'printo_shops',
  PRICING: 'printo_pricing',
  ORDERS: 'printo_orders',
  NOTIFICATIONS: 'printo_notifications',
  INITIALIZED: 'printo_initialized_v2',
};

// Initial Sample Users
export const SAMPLE_USERS: User[] = [
  {
    id: 'user-customer-1',
    name: 'Priya Sharma',
    email: 'priya.sharma@campus.edu',
    phone: '+91 98765 43210',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'user-owner-1',
    name: 'Amit Patel',
    email: 'amit@metrographics.com',
    phone: '+91 98123 45678',
    role: 'shop_owner',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
  }
];

// Initial Sample Shops
export const SAMPLE_SHOPS: Shop[] = [
  {
    id: 'shop-1',
    owner_id: 'user-owner-1',
    shop_name: 'Metro Digital Prints & Xerox Hub',
    tagline: 'High-speed laser printing, CAD blueprints & academic binding',
    address: 'Opposite Engineering Gate 3, Campus Tech Avenue',
    distance: '0.2 km away',
    latitude: 12.9716,
    longitude: 77.5946,
    phone: '+91 98123 45678',
    opening_hours: '8:00 AM – 9:30 PM (Mon – Sat)',
    is_active: true,
    rating: 4.9,
    review_count: 428,
    avg_turnaround_mins: 12,
    current_queue_orders: 2,
    services: ['B&W Laser', 'Vibrant Color', 'Spiral Binding', 'Hardcover Binding', 'A3 Plotting', 'Lamination'],
    banner_color: 'from-blue-600 to-indigo-800',
    accepting_orders: true,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'shop-2',
    owner_id: 'user-owner-2',
    shop_name: 'Apex QuickPrint & Plotters',
    tagline: 'Rapid assignment delivery & thesis gold-foil binding',
    address: 'Central Library Walkway, Shop #4',
    distance: '0.5 km away',
    latitude: 12.9730,
    longitude: 77.5970,
    phone: '+91 98234 56789',
    opening_hours: '8:30 AM – 8:00 PM (Daily)',
    is_active: true,
    rating: 4.8,
    review_count: 276,
    avg_turnaround_mins: 15,
    current_queue_orders: 4,
    services: ['B&W Laser', 'Color Glossy', 'Spiral Binding', 'Corner Stapling', 'Lamination'],
    banner_color: 'from-purple-600 to-brand-700',
    accepting_orders: true,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'shop-3',
    owner_id: 'user-owner-3',
    shop_name: 'Campus Scholar Xerox & Stationery',
    tagline: 'Budget-friendly prints for engineering & medical students',
    address: 'Student Amenity Complex, Ground Floor',
    distance: '0.8 km away',
    latitude: 12.9750,
    longitude: 77.5920,
    phone: '+91 98345 67890',
    opening_hours: '9:00 AM – 7:30 PM (Mon – Fri)',
    is_active: true,
    rating: 4.7,
    review_count: 198,
    avg_turnaround_mins: 18,
    current_queue_orders: 1,
    services: ['B&W Bulk Print', 'Color', 'Spiral Binding', 'Stapling'],
    banner_color: 'from-emerald-600 to-teal-800',
    accepting_orders: true,
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'shop-4',
    owner_id: 'user-owner-4',
    shop_name: 'Blueprint Pro Graphics & Lab',
    tagline: 'Architectural drawings, A3 posters, and premium presentations',
    address: 'North Innovation Quadrangle, Tech Park',
    distance: '1.2 km away',
    latitude: 12.9780,
    longitude: 77.5990,
    phone: '+91 98456 78901',
    opening_hours: '9:00 AM – 9:00 PM',
    is_active: true,
    rating: 4.9,
    review_count: 135,
    avg_turnaround_mins: 25,
    current_queue_orders: 0,
    services: ['A3 Heavy Matte', 'Cad Plots', 'Vibrant Color', 'Hardcover Binding'],
    banner_color: 'from-amber-600 to-orange-800',
    accepting_orders: false,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  }
];

// Initial Shop Pricing
export const SAMPLE_PRICING: Record<string, ShopPricing> = {
  'shop-1': {
    id: 'price-1',
    shop_id: 'shop-1',
    black_white_price: 1.5,
    color_price: 8.0,
    double_sided_discount: 0.5,
    binding_price: 35.0, // spiral
    stapling_price: 5.0,
    lamination_price: 20.0,
    paper_size_multipliers: {
      A4: 1.0,
      A3: 2.2,
      Letter: 1.0,
    }
  },
  'shop-2': {
    id: 'price-2',
    shop_id: 'shop-2',
    black_white_price: 1.75,
    color_price: 9.0,
    double_sided_discount: 0.5,
    binding_price: 40.0,
    stapling_price: 5.0,
    lamination_price: 25.0,
    paper_size_multipliers: {
      A4: 1.0,
      A3: 2.5,
      Letter: 1.0,
    }
  },
  'shop-3': {
    id: 'price-3',
    shop_id: 'shop-3',
    black_white_price: 1.25,
    color_price: 7.5,
    double_sided_discount: 0.25,
    binding_price: 30.0,
    stapling_price: 5.0,
    lamination_price: 18.0,
    paper_size_multipliers: {
      A4: 1.0,
      A3: 2.0,
      Letter: 1.0,
    }
  },
  'shop-4': {
    id: 'price-4',
    shop_id: 'shop-4',
    black_white_price: 2.0,
    color_price: 10.0,
    double_sided_discount: 0.5,
    binding_price: 50.0,
    stapling_price: 10.0,
    lamination_price: 30.0,
    paper_size_multipliers: {
      A4: 1.0,
      A3: 2.4,
      Letter: 1.0,
    }
  }
};

// Initial Sample Orders
export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'ord-101',
    order_number: 'PRN-8842',
    customer_id: 'user-customer-1',
    customer_name: 'Priya Sharma',
    customer_phone: '+91 98765 43210',
    shop_id: 'shop-1',
    shop_name: 'Metro Digital Prints & Xerox Hub',
    status: 'printing',
    document: {
      id: 'doc-101',
      customer_id: 'user-customer-1',
      order_id: 'ord-101',
      file_name: 'Machine_Learning_Term_Paper_Final.pdf',
      file_size: 2456000,
      page_count: 32,
      file_url: '',
      created_at: new Date(Date.now() - 35 * 60000).toISOString(),
    },
    copies: 2,
    color_mode: 'bw',
    paper_size: 'A4',
    sides: 'double',
    orientation: 'portrait',
    page_range: 'all',
    binding_type: 'spiral',
    lamination: false,
    special_instructions: 'Please ensure clear margin alignment on odd/even pages for spiral spine.',
    total_pages_to_print: 64,
    cost_breakdown: {
      paper_and_print: 80.0,
      binding: 70.0,
      finishing: 0,
      taxes: 7.5,
    },
    total_price: 157.5,
    created_at: new Date(Date.now() - 35 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60000).toISOString(),
    estimated_pickup_time: 'Ready in ~10 mins',
  },
  {
    id: 'ord-102',
    order_number: 'PRN-8841',
    customer_id: 'user-customer-1',
    customer_name: 'Priya Sharma',
    customer_phone: '+91 98765 43210',
    shop_id: 'shop-1',
    shop_name: 'Metro Digital Prints & Xerox Hub',
    status: 'ready',
    document: {
      id: 'doc-102',
      customer_id: 'user-customer-1',
      order_id: 'ord-102',
      file_name: 'VLSI_Circuit_Architecture_Schematics.pdf',
      file_size: 1845000,
      page_count: 8,
      file_url: '',
      created_at: new Date(Date.now() - 95 * 60000).toISOString(),
    },
    copies: 1,
    color_mode: 'color',
    paper_size: 'A4',
    sides: 'single',
    orientation: 'landscape',
    page_range: 'all',
    binding_type: 'stapling',
    lamination: false,
    special_instructions: 'High-contrast circuit lines.',
    total_pages_to_print: 8,
    cost_breakdown: {
      paper_and_print: 64.0,
      binding: 5.0,
      finishing: 0,
      taxes: 3.45,
    },
    total_price: 72.45,
    created_at: new Date(Date.now() - 95 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 60000).toISOString(),
    estimated_pickup_time: 'Ready for Collection at Shop Front Desk',
  },
  {
    id: 'ord-103',
    order_number: 'PRN-8840',
    customer_id: 'user-customer-2',
    customer_name: 'Rahul Verma',
    customer_phone: '+91 99887 76655',
    shop_id: 'shop-1',
    shop_name: 'Metro Digital Prints & Xerox Hub',
    status: 'pending',
    document: {
      id: 'doc-103',
      customer_id: 'user-customer-2',
      order_id: 'ord-103',
      file_name: 'Algorithms_Midterm_Solved_Question_Bank.pdf',
      file_size: 3200000,
      page_count: 45,
      file_url: '',
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    copies: 1,
    color_mode: 'bw',
    paper_size: 'A4',
    sides: 'double',
    orientation: 'portrait',
    page_range: 'all',
    binding_type: 'stapling',
    lamination: false,
    special_instructions: '',
    total_pages_to_print: 45,
    cost_breakdown: {
      paper_and_print: 56.25,
      binding: 5.0,
      finishing: 0,
      taxes: 3.06,
    },
    total_price: 64.31,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60000).toISOString(),
    estimated_pickup_time: 'Awaiting shop review',
  },
  {
    id: 'ord-100',
    order_number: 'PRN-8829',
    customer_id: 'user-customer-1',
    customer_name: 'Priya Sharma',
    customer_phone: '+91 98765 43210',
    shop_id: 'shop-1',
    shop_name: 'Metro Digital Prints & Xerox Hub',
    status: 'completed',
    document: {
      id: 'doc-100',
      customer_id: 'user-customer-1',
      order_id: 'ord-100',
      file_name: 'Microprocessors_Lab_Assignment_03.pdf',
      file_size: 1100000,
      page_count: 14,
      file_url: '',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    copies: 1,
    color_mode: 'bw',
    paper_size: 'A4',
    sides: 'single',
    orientation: 'portrait',
    page_range: 'all',
    binding_type: 'stapling',
    lamination: false,
    special_instructions: 'Staple top-left.',
    total_pages_to_print: 14,
    cost_breakdown: {
      paper_and_print: 21.0,
      binding: 5.0,
      finishing: 0,
      taxes: 1.3,
    },
    total_price: 27.3,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
    estimated_pickup_time: 'Collected by Priya Sharma',
  }
];

export const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    user_id: 'user-customer-1',
    order_id: 'ord-102',
    title: 'Order Ready for Pickup! 🎉',
    message: 'Your order PRN-8841 (VLSI Circuit Architecture) is printed, stapled and waiting at Metro Digital Prints counter.',
    is_read: false,
    type: 'success',
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'notif-2',
    user_id: 'user-customer-1',
    order_id: 'ord-101',
    title: 'Printing Started 🖨️',
    message: 'Metro Digital Prints has loaded your document into the high-speed laser press.',
    is_read: true,
    type: 'info',
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 'notif-3',
    user_id: 'user-owner-1',
    order_id: 'ord-103',
    title: 'New Print Request Received 🔔',
    message: 'Rahul Verma submitted order PRN-8840 (Algorithms Question Bank, 45 pages). Tap to review & accept.',
    is_read: false,
    type: 'warning',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  }
];

// Helper to initialize local storage
export function initStorage(): void {
  if (typeof window === 'undefined') return;
  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!initialized) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(SAMPLE_USERS[0]));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SAMPLE_USERS));
    localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(SAMPLE_SHOPS));
    localStorage.setItem(STORAGE_KEYS.PRICING, JSON.stringify(SAMPLE_PRICING));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(SAMPLE_ORDERS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(SAMPLE_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }
}

// User state
export function getCurrentUser(): User {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return raw ? JSON.parse(raw) : SAMPLE_USERS[0];
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  broadcastChange();
}

export function switchRole(role: 'customer' | 'shop_owner'): User {
  const targetUser = SAMPLE_USERS.find(u => u.role === role) || SAMPLE_USERS[0];
  setCurrentUser(targetUser);
  return targetUser;
}

// Shops
export function getShops(): Shop[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.SHOPS);
  return raw ? JSON.parse(raw) : SAMPLE_SHOPS;
}

export function getShopById(shopId: string): Shop | undefined {
  return getShops().find(s => s.id === shopId);
}

export function updateShop(updatedShop: Shop): void {
  const shops = getShops().map(s => s.id === updatedShop.id ? updatedShop : s);
  localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(shops));
  broadcastChange();
}

// Shop Pricing
export function getShopPricing(shopId: string): ShopPricing {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PRICING);
  const map: Record<string, ShopPricing> = raw ? JSON.parse(raw) : SAMPLE_PRICING;
  return map[shopId] || SAMPLE_PRICING['shop-1'];
}

export function updateShopPricing(pricing: ShopPricing): void {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PRICING);
  const map: Record<string, ShopPricing> = raw ? JSON.parse(raw) : { ...SAMPLE_PRICING };
  map[pricing.shop_id] = pricing;
  localStorage.setItem(STORAGE_KEYS.PRICING, JSON.stringify(map));
  broadcastChange();
}

// Orders
export function getOrders(): Order[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
  return raw ? JSON.parse(raw) : SAMPLE_ORDERS;
}

export function getOrderById(orderId: string): Order | undefined {
  return getOrders().find(o => o.id === orderId);
}

export function createOrder(order: Order): void {
  const orders = [order, ...getOrders()];
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

  // Also create a notification for shop owner
  addNotification({
    id: `notif-${Date.now()}`,
    user_id: 'user-owner-1',
    order_id: order.id,
    title: 'New Print Request 🚀',
    message: `${order.customer_name} placed order ${order.order_number} (${order.document.file_name}).`,
    is_read: false,
    type: 'warning',
    created_at: new Date().toISOString(),
  });

  broadcastChange();
}

export function updateOrderStatus(
  orderId: string, 
  status: OrderStatus, 
  rejectionReason?: string
): void {
  const orders = getOrders().map(o => {
    if (o.id === orderId) {
      let eta = o.estimated_pickup_time;
      if (status === 'accepted') eta = 'Ready in approx 20 mins';
      if (status === 'printing') eta = 'Printing in progress (~8 mins)';
      if (status === 'ready') eta = 'Ready for immediate counter pickup!';
      if (status === 'completed') eta = 'Order completed';
      if (status === 'cancelled') eta = 'Order cancelled by customer';
      if (status === 'rejected') eta = `Rejected: ${rejectionReason || 'Shop capacity full'}`;

      return {
        ...o,
        status,
        rejection_reason: rejectionReason,
        estimated_pickup_time: eta,
        updated_at: new Date().toISOString(),
      };
    }
    return o;
  });

  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

  // Find updated order to push notification to customer
  const updatedOrder = orders.find(o => o.id === orderId);
  if (updatedOrder) {
    let title = `Order Update: ${updatedOrder.order_number}`;
    let message = `Your order status changed to ${status.toUpperCase()}.`;
    let type: NotificationItem['type'] = 'info';

    if (status === 'accepted') {
      title = 'Order Accepted! ⚡';
      message = `${updatedOrder.shop_name} accepted your print job and queued it.`;
      type = 'info';
    } else if (status === 'printing') {
      title = 'Printing Started 🖨️';
      message = `${updatedOrder.shop_name} is actively printing your document.`;
      type = 'info';
    } else if (status === 'ready') {
      title = 'Order Ready for Pickup! 🎉';
      message = `Your prints are finished, bound, and waiting at ${updatedOrder.shop_name}.`;
      type = 'success';
    } else if (status === 'completed') {
      title = 'Order Completed ✨';
      message = `Thank you for printing with ${updatedOrder.shop_name}!`;
      type = 'success';
    } else if (status === 'rejected') {
      title = 'Order Declined ❌';
      message = `Shop was unable to accept: ${rejectionReason || 'Capacity issue'}. No charges applied.`;
      type = 'alert';
    }

    addNotification({
      id: `notif-${Date.now()}`,
      user_id: updatedOrder.customer_id,
      order_id: updatedOrder.id,
      title,
      message,
      is_read: false,
      type,
      created_at: new Date().toISOString(),
    });
  }

  broadcastChange();
}

// Notifications
export function getNotifications(userId?: string): NotificationItem[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  const notifs: NotificationItem[] = raw ? JSON.parse(raw) : SAMPLE_NOTIFICATIONS;
  if (userId) {
    return notifs.filter(n => n.user_id === userId);
  }
  return notifs;
}

export function addNotification(notification: NotificationItem): void {
  const notifs = [notification, ...getNotifications()];
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  broadcastChange();
}

export function markNotificationRead(id: string): void {
  const notifs = getNotifications().map(n => n.id === id ? { ...n, is_read: true } : n);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  broadcastChange();
}

export function markAllNotificationsRead(userId: string): void {
  const notifs = getNotifications().map(n => n.user_id === userId ? { ...n, is_read: true } : n);
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  broadcastChange();
}

// Shop Stats calculation
export function getDailyStats(shopId: string): DailyShopStats {
  const orders = getOrders().filter(o => o.shop_id === shopId);
  const todayRevenue = orders
    .filter(o => o.status === 'completed' || o.status === 'ready' || o.status === 'printing')
    .reduce((acc, curr) => acc + curr.total_price, 0);

  const activeQueue = orders.filter(o => 
    o.status === 'pending' || o.status === 'accepted' || o.status === 'printing'
  ).length;

  const completedToday = orders.filter(o => o.status === 'completed').length;

  return {
    today_revenue: Math.round(todayRevenue * 100) / 100,
    today_orders_count: orders.length,
    active_queue_count: activeQueue,
    completed_today: completedToday,
    average_print_time_mins: 11,
  };
}

// Broadcast event across views
export function broadcastChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('printo_storage_update'));
  }
}

// Reset data helper
export function resetDataToDefaults(): void {
  localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
  initStorage();
  broadcastChange();
}
