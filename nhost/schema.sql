-- ==============================================================================
-- PRINTO DATABASE SCHEMA FOR NHOST (PostgreSQL + Hasura)
-- 15 Complete Tables: 11 Core MVP Tables + 4 Recommended Growth Tables
-- Automated triggers for auth sync, updated_at timestamps, and order history tracking
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('customer', 'shop_owner', 'admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'pending',
      'accepted',
      'rejected',
      'printing',
      'ready_for_collection',
      'completed',
      'cancelled'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END $$;

-- 3. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- CORE MVP TABLES (1 - 11)
-- ==============================================================================

-- 1. PROFILES
-- Stores customer and shop-owner account information.
-- In Nhost, links with auth.users (on delete cascade).
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  role user_role DEFAULT 'customer'::user_role NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Foreign key to auth.users if auth schema exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'profiles' 
      AND constraint_name = 'fk_profiles_auth_users'
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT fk_profiles_auth_users
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 2. SHOPS
-- Stores printing shop information.
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_name VARCHAR(255) NOT NULL,
  description TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  pincode VARCHAR(20),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  logo_url TEXT,
  bucket_id VARCHAR(255) UNIQUE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS trigger_shops_updated_at ON public.shops;
CREATE TRIGGER trigger_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 3. SHOP_OPERATING_HOURS
-- Stores individual shop opening and closing hours (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
CREATE TABLE IF NOT EXISTS public.shop_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opening_time TIME,
  closing_time TIME,
  is_closed BOOLEAN DEFAULT false NOT NULL,
  CONSTRAINT uq_shop_operating_day UNIQUE (shop_id, day_of_week)
);

-- 4. SHOP_SERVICES
-- Defines services offered by each printing shop (Printing, scanning, binding, photocopying).
CREATE TABLE IF NOT EXISTS public.shop_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  service_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_available BOOLEAN DEFAULT true NOT NULL
);

-- 5. SHOP_PRICING
-- Stores printing prices configured by shop owners.
CREATE TABLE IF NOT EXISTS public.shop_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL, -- 'Printing', 'Binding', 'Scanning'
  paper_size VARCHAR(20) NOT NULL,    -- 'A4', 'A3'
  color_mode VARCHAR(20) NOT NULL,    -- 'B&W', 'Color'
  sides VARCHAR(20) NOT NULL,         -- 'Single', 'Double'
  price_per_page DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS trigger_shop_pricing_updated_at ON public.shop_pricing;
CREATE TRIGGER trigger_shop_pricing_updated_at
  BEFORE UPDATE ON public.shop_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 6. DOCUMENTS
-- Stores uploaded document metadata. Actual PDF files stored in private object storage.
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_file_id UUID,
  file_name VARCHAR(255) NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  page_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. ORDERS
-- Every customer print request creates an order.
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  status order_status DEFAULT 'pending'::order_status NOT NULL,
  total_pages INTEGER DEFAULT 0 NOT NULL,
  total_copies INTEGER DEFAULT 1 NOT NULL,
  subtotal DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  total_amount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  customer_notes TEXT,
  estimated_completion TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 8. ORDER_DOCUMENTS
-- Connects uploaded documents with individual orders and custom printing options.
CREATE TABLE IF NOT EXISTS public.order_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  copies INTEGER DEFAULT 1 NOT NULL,
  page_range VARCHAR(50),
  color_mode VARCHAR(20) DEFAULT 'B&W' NOT NULL,
  paper_size VARCHAR(20) DEFAULT 'A4' NOT NULL,
  sides VARCHAR(20) DEFAULT 'Single' NOT NULL,
  orientation VARCHAR(20) DEFAULT 'Portrait' NOT NULL,
  binding_type VARCHAR(50) DEFAULT 'None' NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0.00 NOT NULL
);

-- 9. ORDER_STATUS_HISTORY
-- Maintains a history of every order status change.
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger: Stamp completed_at automatically when status transitions to ready_for_collection or completed
CREATE OR REPLACE FUNCTION public.set_order_ready_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.status IN ('ready_for_collection'::order_status, 'completed'::order_status) THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_ready_timestamp ON public.orders;
CREATE TRIGGER trigger_orders_ready_timestamp
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_ready_timestamp();

-- Trigger: Automatically write history when order status changes
CREATE OR REPLACE FUNCTION public.track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.order_status_history (order_id, previous_status, new_status, notes)
    VALUES (NEW.id, OLD.status::VARCHAR, NEW.status::VARCHAR, 'Status updated automatically');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_status_history ON public.orders;
CREATE TRIGGER trigger_order_status_history
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.track_order_status_change();

-- 10. NOTIFICATIONS
-- Stores notifications for customers and shop owners.
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) DEFAULT 'order_update' NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. PAYMENTS
-- Separate payment records from orders.
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'UPI' NOT NULL,
  payment_status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  transaction_id VARCHAR(255),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- ADDITIONAL GROWTH TABLES (12 - 15)
-- ==============================================================================

-- 12. SHOP_STAFF
-- Allows shop owners to add employees who can process orders.
CREATE TABLE IF NOT EXISTS public.shop_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  designation VARCHAR(100),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_shop_staff UNIQUE (shop_id, user_id)
);

-- 13. REVIEWS
-- Allows customers to rate printing shops for completed orders.
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id UUID UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 14. SUPPORT_TICKETS
-- For customer complaints and shop-related issues.
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open' NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ
);

-- 15. DOCUMENT_ACCESS_LOGS
-- Tracks who accesses customer documents for privacy auditing.
CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  accessed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'view', 'download', 'print'
  accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON public.shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_is_active ON public.shops(is_active);
CREATE INDEX IF NOT EXISTS idx_shops_active_name ON public.shops(shop_name ASC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_operating_hours_shop ON public.shop_operating_hours(shop_id);
CREATE INDEX IF NOT EXISTS idx_services_shop ON public.shop_services(shop_id);
CREATE INDEX IF NOT EXISTS idx_pricing_shop ON public.shop_pricing(shop_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON public.documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created_at ON public.orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON public.orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_created_at ON public.orders(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_ready_cleanup ON public.orders(status, completed_at, updated_at) WHERE status IN ('ready_for_collection', 'completed');
CREATE INDEX IF NOT EXISTS idx_order_documents_order ON public.order_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_order_documents_document ON public.order_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_unread_user_created ON public.notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop ON public.shop_staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_shop ON public.reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_logs_document ON public.document_access_logs(document_id);

-- ==============================================================================
-- PROFILE HELPER FUNCTION
-- Used to upsert a profile after Nhost auth sign-in/up
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_nhost_user(
  user_id UUID,
  user_email VARCHAR,
  user_display_name VARCHAR DEFAULT NULL,
  user_avatar_url TEXT DEFAULT NULL,
  user_role_input user_role DEFAULT 'customer'::user_role
)
RETURNS public.profiles AS $$
DECLARE
  result_profile public.profiles;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    user_id,
    user_email,
    COALESCE(user_display_name, split_part(COALESCE(user_email, 'User'), '@', 1)),
    user_avatar_url,
    user_role_input
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW()
  RETURNING * INTO result_profile;

  RETURN result_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- AUTO-CLEANUP: Delete ready_for_collection orders 8 hours after ready timestamp
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.purge_expired_ready_orders(
  ttl INTERVAL DEFAULT INTERVAL '8 hours'
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  expired_order_ids UUID[];
  orphan_doc_ids UUID[];
BEGIN
  SELECT COALESCE(array_agg(o.id), ARRAY[]::UUID[])
  INTO expired_order_ids
  FROM public.orders o
  WHERE o.status IN ('ready_for_collection'::order_status, 'completed'::order_status)
    AND COALESCE(o.completed_at, o.updated_at, o.created_at) <= (NOW() - ttl);

  IF cardinality(expired_order_ids) = 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT od.document_id), ARRAY[]::UUID[])
  INTO orphan_doc_ids
  FROM public.order_documents od
  WHERE od.order_id = ANY(expired_order_ids);

  DELETE FROM public.orders
  WHERE id = ANY(expired_order_ids);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF cardinality(orphan_doc_ids) > 0 THEN
    DELETE FROM public.documents d
    WHERE d.id = ANY(orphan_doc_ids)
      AND NOT EXISTS (
        SELECT 1 FROM public.order_documents od2 WHERE od2.document_id = d.id
      );
  END IF;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: automatically schedule every 15 minutes if pg_cron is enabled on the DB host
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'purge-expired-ready-orders-8h',
      '*/15 * * * *',
      'SELECT public.purge_expired_ready_orders(INTERVAL ''8 hours'');'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- ==============================================================================
-- CASCADE FOREIGN KEYS: Allow deleting shops, customers, and documents cleanly
-- Fixes RESTRICT errors such as orders_shop_id_fkey when deleting a shop row.
-- ==============================================================================
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shop_id_fkey;
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_shop_id_fkey
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

  ALTER TABLE public.order_documents DROP CONSTRAINT IF EXISTS order_documents_document_id_fkey;
  ALTER TABLE public.order_documents
    ADD CONSTRAINT order_documents_document_id_fkey
    FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

  ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_customer_id_fkey;
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
END $$;

