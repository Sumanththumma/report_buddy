-- =========================================================================
-- RetailKhata (Report Buddy) - Complete Supabase Database Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- =========================================================================

-- 1. Users / Retail Shops Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  owner_name TEXT,
  store_category TEXT DEFAULT 'General Retail',
  tagline TEXT DEFAULT 'Your neighborhood retail shop',
  logo_icon TEXT DEFAULT 'Store',
  theme_color TEXT DEFAULT 'indigo',
  phone TEXT,
  address TEXT,
  receipt_footer TEXT DEFAULT 'Thank you for shopping with us! Please visit again.',
  gstin TEXT,
  currency TEXT DEFAULT '₹',
  gemini_api_key TEXT,
  gemini_preferred_model TEXT DEFAULT 'gemini-2.0-flash',
  dark_mode INTEGER DEFAULT 1,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Catalog Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hsn_code TEXT NOT NULL,
  price NUMERIC NOT NULL,
  cost_price NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 18,
  unit TEXT DEFAULT 'pcs',
  category TEXT DEFAULT 'General',
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daily Z-Reports Table
CREATE TABLE IF NOT EXISTS public.z_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  report_number TEXT,
  closing_time TEXT,
  store_name TEXT,
  register_id TEXT,
  gross_sales NUMERIC DEFAULT 0,
  net_sales NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  tax_total NUMERIC DEFAULT 0,
  total_items_sold INTEGER DEFAULT 0,
  payment_cash NUMERIC DEFAULT 0,
  payment_upi NUMERIC DEFAULT 0,
  payment_card NUMERIC DEFAULT 0,
  raw_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 4. Z-Report Line Items Table
CREATE TABLE IF NOT EXISTS public.z_report_items (
  id TEXT PRIMARY KEY,
  z_report_id TEXT NOT NULL REFERENCES public.z_reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  hsn_code TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC NOT NULL,
  line_total NUMERIC NOT NULL,
  tax_rate NUMERIC DEFAULT 18,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- High-speed indexes
CREATE INDEX IF NOT EXISTS idx_products_user ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_zreports_user_date ON public.z_reports(user_id, date);
CREATE INDEX IF NOT EXISTS idx_zreport_items_report ON public.z_report_items(z_report_id);

-- Row Level Security (RLS) - Permissive for authenticated server / service role
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.z_report_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access for backend server" ON public.users;
CREATE POLICY "Full access for backend server" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for backend server" ON public.products;
CREATE POLICY "Full access for backend server" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for backend server" ON public.z_reports;
CREATE POLICY "Full access for backend server" ON public.z_reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for backend server" ON public.z_report_items;
CREATE POLICY "Full access for backend server" ON public.z_report_items FOR ALL USING (true) WITH CHECK (true);
