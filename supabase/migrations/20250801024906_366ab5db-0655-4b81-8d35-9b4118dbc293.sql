-- Fix function search path security issue
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';