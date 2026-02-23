import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Retry helper with exponential backoff
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 500) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Server Supabase retry ${i + 1}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
          console.error('Cookie setting error in Server Component:', error);
        }
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    }
  });
}

/**
 * Server-side auth methods
 */
export async function getServerSession() {
  try {
    return await withRetry(async () => {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }, 3, 500);
  } catch (error) {
    console.error('Failed to get server session after retries:', error);
    return null;
  }
}

export async function getServerUser() {
  try {
    return await withRetry(async () => {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }, 3, 500);
  } catch (error) {
    console.error('Failed to get server user after retries:', error);
    return null;
  }
}

/**
 * Server-side data methods - Trades Management
 */
export async function getTradesServer(userId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching trades:', error);
    return null;
  }
  return data || [];
}

export async function addTradeServer(userId, trade) {
  const supabase = await createClient();
  const { commission, shares } = trade;
  
  // Auto-calculate commission if not provided
  const finalCommission = commission ?? Math.max(shares * 0.005, 1.0);
  
  const { data, error } = await supabase
    .from('trades')
    .insert([
      {
        user_id: userId,
        ticker: trade.ticker.toUpperCase(),
        side: trade.side.toLowerCase(),
        shares: parseFloat(trade.shares),
        price: parseFloat(trade.price),
        commission: finalCommission,
      },
    ])
    .select();
  
  if (error) {
    console.error('Error adding trade:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function deleteTradeServer(tradeId, userId) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', tradeId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting trade:', error);
    return false;
  }
  return true;
}

export async function updateTradeServer(tradeId, userId, trade) {
  const supabase = await createClient();
  const updates = {
    ticker: trade.ticker?.toUpperCase(),
    side: trade.side?.toLowerCase(),
    shares: trade.shares ? parseFloat(trade.shares) : undefined,
    price: trade.price ? parseFloat(trade.price) : undefined,
    commission: trade.commission ? parseFloat(trade.commission) : undefined,
  };
  
  // Remove undefined values
  Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
  
  const { data, error } = await supabase
    .from('trades')
    .update(updates)
    .eq('id', tradeId)
    .eq('user_id', userId)
    .select();
  
  if (error) {
    console.error('Error updating trade:', error);
    return null;
  }
  return data?.[0] || null;
}
