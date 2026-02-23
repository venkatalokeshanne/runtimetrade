'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create a singleton instance
let supabaseClient = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'trading-dash-auth',
      },
    });
  }
  return supabaseClient;
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
        console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Client-side auth methods
 */
export async function signUp(email, password) {
  const supabase = getSupabaseClient();
  return shouldRetry(async () => supabase.auth.signUp({ email, password }));
}

export async function signIn(email, password) {
  const supabase = getSupabaseClient();
  return shouldRetry(async () => supabase.auth.signInWithPassword({ email, password }));
}

export async function signOut() {
  const supabase = getSupabaseClient();
  return shouldRetry(async () => supabase.auth.signOut());
}

async function shouldRetry(fn) {
  return withRetry(fn, 3, 500);
}

export async function getSession() {
  const supabase = getSupabaseClient();
  try {
    return await withRetry(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }, 3, 500);
  } catch (error) {
    console.error('Failed to get session after retries:', error);
    return null;
  }
}

export async function getUser() {
  const supabase = getSupabaseClient();
  try {
    return await withRetry(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }, 3, 500);
  } catch (error) {
    console.error('Failed to get user after retries:', error);
    return null;
  }
}

/**
 * Client-side data methods - Trades Management
 */
export async function getTrades(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching trades:', error);
    return null;
  }
  
  // Ensure all trades have valid commission and defaults for new fields
  return (data || []).map(trade => {
    const orderType = trade.order_type || 'trade';
    const isOrder = orderType === 'order';
    const currency = trade.currency || 'USD';
    const instrumentType = trade.instrument_type || 'stock';
    return {
      ...trade,
      order_type: orderType,
      currency,
      base_currency: trade.base_currency || null,
      instrument_type: instrumentType,
      realized_pl: trade.realized_pl ?? 0,
      realized_pl_currency: trade.realized_pl_currency || currency,
      parent_order_id: trade.parent_order_id || null,
      commission: trade.commission && trade.commission > 0 
        ? trade.commission 
        : (isOrder ? 0 : Math.max((trade.shares || 0) * 0.005, 1.0))
    };
  });
}

export async function addTrade(userId, trade) {
  const supabase = getSupabaseClient();
  const { commission, orderType = 'trade' } = trade;
  const finalCommission = orderType === 'order' ? 0 : parseFloat(commission) || 0;
  
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
        order_type: orderType,
        currency: trade.currency || 'USD',
        base_currency: trade.baseCurrency || null,
        instrument_type: trade.instrumentType || 'stock',
        realized_pl: trade.realizedPl ?? 0,
        realized_pl_currency: trade.realizedPlCurrency || trade.currency || 'USD',
        parent_order_id: trade.parentOrderId || null,
      },
    ])
    .select();
  
  if (error) {
    console.error('Error adding trade:', error);
    return null;
  }
  return data?.[0] || null;
}

export async function deleteTrade(tradeId) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', tradeId);
  
  if (error) {
    console.error('Error deleting trade:', error);
    return false;
  }
  return true;
}

export async function updateTrade(tradeId, updates = {}) {
  const supabase = getSupabaseClient();
  const cleanUpdates = {};
  
  // Only update fields that are provided in the updates object
  if ('ticker' in updates && updates.ticker) cleanUpdates.ticker = updates.ticker.toUpperCase();
  if ('side' in updates && updates.side) cleanUpdates.side = updates.side.toLowerCase();
  if ('shares' in updates && updates.shares) cleanUpdates.shares = parseFloat(updates.shares);
  if ('price' in updates && updates.price) cleanUpdates.price = parseFloat(updates.price);
  if ('commission' in updates && updates.commission !== undefined) cleanUpdates.commission = parseFloat(updates.commission);
  if ('order_type' in updates) cleanUpdates.order_type = updates.order_type;
  
  // Only update if there are changes
  if (Object.keys(cleanUpdates).length === 0) {
    console.warn('No updates provided');
    return null;
  }
  
  const { data, error } = await supabase
    .from('trades')
    .update(cleanUpdates)
    .eq('id', tradeId)
    .select();
  
  if (error) {
    console.error('Error updating trade:', error);
    return null;
  }
  return data?.[0] || null;
}

/**
 * Get all deposits/withdrawals for a user
 */
export async function getDepositsWithdrawals(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('deposits_withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching deposits/withdrawals:', error);
    return [];
  }
  return data || [];
}

/**
 * Add a deposit or withdrawal
 */
export async function addDepositWithdrawal(userId, { type, amount, description = '' }) {
  const supabase = getSupabaseClient();
  
  if (!['deposit', 'withdrawal'].includes(type)) {
    console.error('Invalid type. Must be "deposit" or "withdrawal"');
    return null;
  }
  
  if (!amount || amount <= 0) {
    console.error('Amount must be positive');
    return null;
  }
  
  const { data, error } = await supabase
    .from('deposits_withdrawals')
    .insert({
      user_id: userId,
      type,
      amount,
      description,
      created_at: new Date().toISOString(),
    })
    .select();
  
  if (error) {
    console.error('Error adding deposit/withdrawal:', error);
    return null;
  }
  return data?.[0] || null;
}

/**
 * Delete a deposit or withdrawal
 */
export async function deleteDepositWithdrawal(id) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('deposits_withdrawals')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting deposit/withdrawal:', error);
    return false;
  }
  return true;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
