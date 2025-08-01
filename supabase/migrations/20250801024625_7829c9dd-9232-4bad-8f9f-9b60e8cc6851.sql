-- Drop topups table since we'll handle topups through orders
DROP TABLE IF EXISTS public.topups;

-- Add order_type to orders table to distinguish between NEW, TOPUP, NEW-Unlimited
ALTER TABLE public.orders ADD COLUMN order_type TEXT DEFAULT 'NEW';

-- Add parent_order_id for topup orders to reference original order
ALTER TABLE public.orders ADD COLUMN parent_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Add exchange_rate and markup settings to app_settings
INSERT INTO public.app_settings (key, value) VALUES 
  ('exchange_rate_usd_to_idr', '{"value": 17000}'),
  ('markup_tiers', '{"tier1": {"min_price": 0, "max_price": 50, "markup_percentage": 20}, "tier2": {"min_price": 50, "max_price": 100, "markup_percentage": 15}, "tier3": {"min_price": 100, "max_price": 999999, "markup_percentage": 10}}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create demo admin user function
CREATE OR REPLACE FUNCTION create_demo_admin()
RETURNS void AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if demo admin already exists
    SELECT user_id INTO admin_user_id 
    FROM public.admin_users 
    WHERE EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = admin_users.user_id 
        AND auth.users.email = 'admin@esimnexus.com'
    );
    
    -- Only create if doesn't exist
    IF admin_user_id IS NULL THEN
        -- Insert into auth.users table (this is a simplified approach)
        -- In production, you should create this user through Supabase Auth
        INSERT INTO public.app_settings (key, value) VALUES 
        ('demo_admin_instructions', '{"message": "Please create admin user with email: admin@esimnexus.com and password: admin123 through Supabase Auth, then add to admin_users table"}')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function
SELECT create_demo_admin();