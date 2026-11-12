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

