-- ==============================================================================
-- PRINTO SAMPLE SEED DATA
-- Pre-populates sample shops, services, pricing, and operating hours
-- ==============================================================================

-- 1. Insert Demo Auth Users if auth.users exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    INSERT INTO auth.users (id, email, display_name, avatar_url, locale, default_role)
    VALUES
      ('a1111111-1111-1111-1111-111111111111', 'amit@metrohubs.com', 'Amit Patel', '', 'en', 'user'),
      ('a2222222-2222-2222-2222-222222222222', 'suresh@campusprint.com', 'Suresh Kumar', '', 'en', 'user'),
      ('a3333333-3333-3333-3333-333333333333', 'priya@campus.edu', 'Priya Sharma', '', 'en', 'user')
    ON CONFLICT (id) DO UPDATE SET
      display_name = EXCLUDED.display_name;
  END IF;
END $$;

-- 2. Ensure Demo Profiles exist
INSERT INTO public.profiles (id, full_name, email, phone, role)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Amit Patel', 'amit@metrohubs.com', '+91 98765 43210', 'shop_owner'),
  ('a2222222-2222-2222-2222-222222222222', 'Suresh Kumar', 'suresh@campusprint.com', '+91 98765 43211', 'shop_owner'),
  ('a3333333-3333-3333-3333-333333333333', 'Priya Sharma', 'priya@campus.edu', '+91 98765 43212', 'customer')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- 3. Insert Demo Shops
INSERT INTO public.shops (id, owner_id, shop_name, description, phone, email, address, city, pincode, latitude, longitude, is_active)
VALUES
  (
    'b1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'Metro Graphics & Xerox',
    'High-speed digital laser printing, thesis spiral binding, and blueprints next to Academic Block 3.',
    '+91 98765 43210',
    'amit@metrohubs.com',
    'Gate 2, Academic Complex, Campus Lane',
    'Bangalore',
    '560001',
    12.9716,
    77.5946,
    true
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'PrintFast Express Hub',
    'Express 30-second grab-and-go color prints, glossy posters, and laminations right at the Student Center.',
    '+91 98765 43211',
    'suresh@campusprint.com',
    'Ground Floor, Student Activities Center',
    'Bangalore',
    '560002',
    12.9720,
    77.5950,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  shop_name = EXCLUDED.shop_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- 4. Insert Shop Operating Hours (Monday - Sunday)
INSERT INTO public.shop_operating_hours (shop_id, day_of_week, opening_time, closing_time, is_closed)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 1, '08:00:00', '21:00:00', false),
  ('b1111111-1111-1111-1111-111111111111', 2, '08:00:00', '21:00:00', false),
  ('b1111111-1111-1111-1111-111111111111', 3, '08:00:00', '21:00:00', false),
  ('b1111111-1111-1111-1111-111111111111', 4, '08:00:00', '21:00:00', false),
  ('b1111111-1111-1111-1111-111111111111', 5, '08:00:00', '21:00:00', false),
  ('b1111111-1111-1111-1111-111111111111', 6, '09:00:00', '19:00:00', false),
  ('b1111111-1111-1111-1111-111111111111', 0, '10:00:00', '17:00:00', true),
  ('b2222222-2222-2222-2222-222222222222', 1, '07:30:00', '22:00:00', false),
  ('b2222222-2222-2222-2222-222222222222', 2, '07:30:00', '22:00:00', false),
  ('b2222222-2222-2222-2222-222222222222', 3, '07:30:00', '22:00:00', false),
  ('b2222222-2222-2222-2222-222222222222', 4, '07:30:00', '22:00:00', false),
  ('b2222222-2222-2222-2222-222222222222', 5, '07:30:00', '22:00:00', false),
  ('b2222222-2222-2222-2222-222222222222', 6, '08:30:00', '20:00:00', false),
  ('b2222222-2222-2222-2222-222222222222', 0, '10:00:00', '18:00:00', false)
ON CONFLICT (shop_id, day_of_week) DO UPDATE SET
  opening_time = EXCLUDED.opening_time,
  closing_time = EXCLUDED.closing_time,
  is_closed = EXCLUDED.is_closed;

-- 5. Insert Shop Services
INSERT INTO public.shop_services (shop_id, service_name, description, is_available)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Laser Printing', 'Fast 1200 DPI B&W and color laser document printing', true),
  ('b1111111-1111-1111-1111-111111111111', 'Spiral Binding', 'Durable spiral binding with transparent front cover', true),
  ('b1111111-1111-1111-1111-111111111111', 'Hardcover Thesis Binding', 'Gold-embossed official university thesis binding', true),
  ('b2222222-2222-2222-2222-222222222222', 'Express Print', 'Ultra-fast 30s queue-jump prints', true),
  ('b2222222-2222-2222-2222-222222222222', 'Color Posters', 'A3 vibrant glossy presentation and event posters', true)
ON CONFLICT DO NOTHING;

-- 6. Insert Shop Pricing
INSERT INTO public.shop_pricing (shop_id, service_type, paper_size, color_mode, sides, price_per_page)
VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Printing', 'A4', 'B&W', 'Single', 2.00),
  ('b1111111-1111-1111-1111-111111111111', 'Printing', 'A4', 'B&W', 'Double', 3.00),
  ('b1111111-1111-1111-1111-111111111111', 'Printing', 'A4', 'Color', 'Single', 10.00),
  ('b1111111-1111-1111-1111-111111111111', 'Printing', 'A4', 'Color', 'Double', 18.00),
  ('b1111111-1111-1111-1111-111111111111', 'Printing', 'A3', 'B&W', 'Single', 5.00),
  ('b1111111-1111-1111-1111-111111111111', 'Printing', 'A3', 'Color', 'Single', 25.00),

  ('b2222222-2222-2222-2222-222222222222', 'Printing', 'A4', 'B&W', 'Single', 2.50),
  ('b2222222-2222-2222-2222-222222222222', 'Printing', 'A4', 'B&W', 'Double', 3.50),
  ('b2222222-2222-2222-2222-222222222222', 'Printing', 'A4', 'Color', 'Single', 12.00),
  ('b2222222-2222-2222-2222-222222222222', 'Printing', 'A4', 'Color', 'Double', 20.00)
ON CONFLICT DO NOTHING;
