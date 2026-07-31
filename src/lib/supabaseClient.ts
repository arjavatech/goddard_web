// Keep a single Supabase client in the browser. Creating another client with
// the same storage key causes competing auth listeners and undefined session
// behaviour during login.
export { supabase } from '../services/auth/authClient';
