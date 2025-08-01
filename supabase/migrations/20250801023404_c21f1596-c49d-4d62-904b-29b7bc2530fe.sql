-- Create enum types for eSIM status and order status
CREATE TYPE public.esim_status AS ENUM ('active', 'suspended', 'cancelled', 'revoked');
CREATE TYPE public.order_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE public.package_type AS ENUM ('data', 'voice', 'sms', 'combo');

-- Create eSIM packages table
CREATE TABLE public.esim_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  country_code TEXT NOT NULL,
  region TEXT,
  data_amount_mb INTEGER,
  validity_days INTEGER NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  package_type package_type DEFAULT 'data',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.esim_packages(id) ON DELETE RESTRICT NOT NULL,
  order_reference TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  status order_status DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  markup_amount DECIMAL(10,2) DEFAULT 0,
  payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create eSIMs table for individual eSIM instances
CREATE TABLE public.esims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  esim_token TEXT UNIQUE NOT NULL,
  iccid TEXT UNIQUE NOT NULL,
  qr_code_url TEXT,
  activation_code TEXT,
  status esim_status DEFAULT 'active',
  data_used_mb INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create top-ups table
CREATE TABLE public.topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  esim_id UUID REFERENCES public.esims(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES public.esim_packages(id) ON DELETE RESTRICT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_id TEXT,
  status order_status DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create settings table for app configuration
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create admin users table for role management
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.esim_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access to packages (anyone can view available packages)
CREATE POLICY "Anyone can view active packages" ON public.esim_packages
  FOR SELECT USING (is_active = true);

-- Admin users can manage all data
CREATE POLICY "Admins can manage packages" ON public.esim_packages
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage esims" ON public.esims
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage topups" ON public.topups
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage admin users" ON public.admin_users
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  ));

-- Users can view their own orders and eSIMs
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view own esims" ON public.esims
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE public.orders.id = public.esims.order_id 
    AND public.orders.user_id = auth.uid()
  ));

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_esim_packages_updated_at
  BEFORE UPDATE ON public.esim_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_esims_updated_at
  BEFORE UPDATE ON public.esims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES 
  ('markup_percentage', '{"value": 10}'),
  ('payment_gateway', '{"provider": "stripe", "enabled": true}'),
  ('api_endpoints', '{"esimaccess_base_url": "https://api.esimaccess.com"}');