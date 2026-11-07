-- Migration: 1710000000000_init_printo_schema (down)

DROP TABLE IF EXISTS public.document_access_logs CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.shop_staff CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.order_status_history CASCADE;
DROP TABLE IF EXISTS public.order_documents CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.shop_pricing CASCADE;
DROP TABLE IF EXISTS public.shop_services CASCADE;
DROP TABLE IF EXISTS public.shop_operating_hours CASCADE;
DROP TABLE IF EXISTS public.shops CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.track_order_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.set_current_timestamp_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_nhost_user() CASCADE;

DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

