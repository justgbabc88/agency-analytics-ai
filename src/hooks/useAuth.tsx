
import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { validateEmail, validatePassword, rateLimitCheck, sanitizeInput } from '@/utils/validation';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Log security events
        if (event === 'SIGNED_IN') {
          console.log('[SECURITY] User signed in successfully');
        } else if (event === 'SIGNED_OUT') {
          console.log('[SECURITY] User signed out');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, agencyName: string) => {
    // Rate limiting check
    if (!rateLimitCheck(`signup_${email}`, 3, 60 * 60 * 1000)) { // 3 attempts per hour
      throw new Error('Too many signup attempts. Please try again later.');
    }

    // Input validation
    if (!validateEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password requirements not met: ${passwordValidation.errors.join(', ')}`);
    }

    const sanitizedAgencyName = sanitizeInput(agencyName);
    if (sanitizedAgencyName.length < 2) {
      throw new Error('Agency name must be at least 2 characters long.');
    }

    console.log('[SECURITY] Attempting user signup with validated inputs');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      console.log('[SECURITY] Signup failed:', error.message);
      throw error;
    }

    if (data.user && !error) {
      console.log('[SECURITY] User created, creating agency');
      // Create agency for the new user
      const { error: agencyError } = await supabase
        .from('agencies')
        .insert([{
          user_id: data.user.id,
          name: sanitizedAgencyName,
        }]);

      if (agencyError) {
        console.error('[SECURITY] Error creating agency:', agencyError);
        throw agencyError;
      }
    }

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    // Rate limiting check
    if (!rateLimitCheck(`signin_${email}`, 5, 15 * 60 * 1000)) { // 5 attempts per 15 minutes
      console.log('[SECURITY] Rate limit exceeded for login attempts');
      throw new Error('Too many login attempts. Please try again in 15 minutes.');
    }

    // Input validation
    if (!validateEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }

    if (password.length < 1) {
      throw new Error('Password is required.');
    }

    console.log('[SECURITY] Attempting user signin');

    const result = await supabase.auth.signInWithPassword({ email, password });
    
    if (result.error) {
      console.log('[SECURITY] Login failed:', result.error.message);
    } else {
      console.log('[SECURITY] Login successful');
    }

    return result;
  };

  const signOut = async () => {
    console.log('[SECURITY] User signing out');
    return await supabase.auth.signOut();
  };

  const ensureAgency = async (agencyName: string = 'My Agency') => {
    if (!user) return null;

    const sanitizedAgencyName = sanitizeInput(agencyName);

    // Check if agency already exists
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingAgency) {
      return existingAgency;
    }

    console.log('[SECURITY] Creating new agency for user');

    // Create agency if it doesn't exist
    const { data: newAgency, error } = await supabase
      .from('agencies')
      .insert([{
        user_id: user.id,
        name: sanitizedAgencyName,
      }])
      .select()
      .single();

    if (error) {
      console.error('[SECURITY] Error creating agency:', error);
      throw error;
    }

    return newAgency;
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    ensureAgency,
  };
};
