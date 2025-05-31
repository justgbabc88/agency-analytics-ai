
import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (data.user && !error) {
      // Create agency for the new user
      const { error: agencyError } = await supabase
        .from('agencies')
        .insert([{
          user_id: data.user.id,
          name: agencyName,
        }]);

      if (agencyError) {
        console.error('Error creating agency:', agencyError);
        throw agencyError;
      }
    }

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    return await supabase.auth.signOut();
  };

  const ensureAgency = async (agencyName: string = 'My Agency') => {
    if (!user) return null;

    // Check if agency already exists
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingAgency) {
      return existingAgency;
    }

    // Create agency if it doesn't exist
    const { data: newAgency, error } = await supabase
      .from('agencies')
      .insert([{
        user_id: user.id,
        name: agencyName,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating agency:', error);
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
