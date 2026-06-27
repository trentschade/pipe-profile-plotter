import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let currentUser = null;
let currentTier = 'free';
let onAuthChange = null;

export function getUser(){ return currentUser; }
export function getTier(){ return currentTier; }
export function isPremium(){ return currentTier === 'premium'; }

export function setOnAuthChange(cb){ onAuthChange = cb; }

async function fetchTier(userId){
  const { data } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single();
  return data?.tier || 'free';
}

export async function signUp(email, password){
  const { data, error } = await supabase.auth.signUp({ email, password });
  if(error) throw error;
  return data;
}

export async function signIn(email, password){
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) throw error;
  return data;
}

export async function signOut(){
  const { error } = await supabase.auth.signOut();
  if(error) throw error;
}

export async function initAuth(){
  const { data:{ session } } = await supabase.auth.getSession();
  if(session?.user){
    currentUser = session.user;
    currentTier = await fetchTier(session.user.id);
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if(session?.user){
      currentUser = session.user;
      currentTier = await fetchTier(session.user.id);
    } else {
      currentUser = null;
      currentTier = 'free';
    }
    if(onAuthChange) onAuthChange(currentUser, currentTier);
  });
}
