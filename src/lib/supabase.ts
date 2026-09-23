import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==============================================================================
// CENTRALIZED SUPABASE CLIENT
// Browser application client using VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
// ==============================================================================

// Read environment variables
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
// Support both standard VITE_SUPABASE_PUBLISHABLE_KEY and legacy VITE_SUPABASE_ANON_KEY
const rawKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

// Safety validation: Reject any secret / service_role keys from frontend code
const isSecretKey =
  rawKey.startsWith('sb_secret_') ||
  rawKey.toLowerCase().includes('service_role') ||
  rawKey.includes('SUPABASE_SECRET');

function validateConfig(url: string, key: string): { valid: boolean; error: string | null } {
  if (isSecretKey) {
    return {
      valid: false,
      error:
        'Security Error: A Supabase service_role / secret key was detected. Only use the public/publishable anon key in the browser.',
    };
  }

  if (!url || !key) {
    return {
      valid: false,
      error:
        'Supabase configuration is missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment.',
    };
  }

  if (
    url.includes('xxxxx') ||
    url.includes('your-project') ||
    url.includes('example.supabase.co') ||
    !url.startsWith('https://')
  ) {
    return {
      valid: false,
      error:
        'Invalid Supabase URL format. Please provide a valid project URL (e.g. https://your-project-ref.supabase.co).',
    };
  }

  if (key.length < 20 || key.includes('YOUR_')) {
    return {
      valid: false,
      error:
        'Invalid Supabase publishable key. Please provide the public anon/publishable key from your Supabase Dashboard.',
    };
  }

  return { valid: true, error: null };
}

const configStatus = validateConfig(rawUrl, rawKey);

export const isSupabaseConfigured: boolean = configStatus.valid;
export const supabaseUrl: string = rawUrl;

export function getSupabaseConfigError(): string | null {
  return configStatus.error;
}

// Fallback dummy URL and Key for unconfigured state so client instantiation does not throw fatal module crash
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? rawUrl : fallbackUrl,
  isSupabaseConfigured ? rawKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'aquaflow_supabase_auth_token',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/**
 * Friendly Error Parser
 * Translates technical Supabase / PostgREST errors into clean, user-friendly messages.
 */
export function formatSupabaseError(error: any): string {
  if (!error) return 'An unexpected error occurred.';

  const message = typeof error === 'string' ? error : error.message || error.error_description || '';
  const code = error.code || '';

  if (!isSupabaseConfigured) {
    return 'Supabase configuration is missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.';
  }

  // Network / Connection
  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    code === 'ECONNREFUSED'
  ) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  // Auth credential failure
  if (
    message.includes('Invalid login credentials') ||
    message.includes('invalid_grant') ||
    message.includes('Invalid email or password')
  ) {
    return 'Email or password is incorrect.';
  }

  // API Key issues
  if (message.includes('Invalid API key') || message.includes('apikey')) {
    return 'Invalid Supabase API key. Please check your VITE_SUPABASE_PUBLISHABLE_KEY.';
  }

  // RLS / Permission issues
  if (
    code === '42501' ||
    message.includes('row-level security') ||
    message.includes('permission denied')
  ) {
    return 'You do not have permission to access or modify this information.';
  }

  // Resource not found
  if (code === 'PGRST116' || message.includes('JSON object requested, multiple (or no) rows returned')) {
    return 'Requested record was not found.';
  }

  // Foreign key / constraint violation
  if (code === '23505' || message.includes('duplicate key value')) {
    return 'A record with these unique details already exists.';
  }

  return message || 'Operation failed. Please try again.';
}

/**
 * Health Check Probe
 * Performs a live query to confirm database connection and authentication readiness.
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  error?: string;
  details?: { url: string; authSession: boolean; tableCount?: number };
}> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      message: 'Supabase configuration is missing.',
      error: getSupabaseConfigError() || undefined,
    };
  }

  try {
    // 1. Probe session
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      return {
        connected: false,
        message: 'Supabase Auth session probe failed.',
        error: formatSupabaseError(sessionErr),
      };
    }

    // 2. Probe public database endpoint
    const { error: dbErr } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (dbErr) {
      // If table doesn't exist yet, distinguish from network failure
      if (dbErr.code === '42P01') {
        return {
          connected: true,
          message: 'Connected to Supabase! (Database tables require migration schema to be executed)',
          error: dbErr.message,
          details: { url: rawUrl, authSession: Boolean(sessionData?.session) },
        };
      }

      return {
        connected: false,
        message: 'Database query failed.',
        error: formatSupabaseError(dbErr),
        details: { url: rawUrl, authSession: Boolean(sessionData?.session) },
      };
    }

    return {
      connected: true,
      message: 'Supabase connection verified successfully.',
      details: { url: rawUrl, authSession: Boolean(sessionData?.session) },
    };
  } catch (err: any) {
    return {
      connected: false,
      message: 'Failed to connect to Supabase.',
      error: formatSupabaseError(err),
    };
  }
}
