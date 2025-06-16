
-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

-- Drop and recreate the function with proper security settings
DROP FUNCTION IF EXISTS public.handle_new_user_profile();

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, timezone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();
