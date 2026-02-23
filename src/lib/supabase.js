/**
 * Supabase Client Initialization
 * 
 * This file provides a compatibility layer for accessing Supabase clients.
 * Use the client-side methods from @/lib/supabase/client.js in 'use client' components
 * Use the server-side methods from @/lib/supabase/server.js in Server Components
 */

// Re-export client methods for use in 'use client' components
export {
  getSupabaseClient,
  signUp,
  signIn,
  signOut,
  getSession,
  getUser,
  saveCalculation,
  getCalculations,
  onAuthStateChange,
} from './supabase/client.js';

// Re-export server methods for use in Server Components
export {
  createClient,
  getServerSession,
  getServerUser,
  saveCalculationServer,
  getCalculationsServer,
} from './supabase/server.js';
