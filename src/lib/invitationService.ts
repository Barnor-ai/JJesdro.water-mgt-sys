/**
 * H2O Water Management System - Client Invitation Service
 * Connects to secure server-side invite-user Edge Function,
 * manages environment-aware redirect URLs, prevents false successes,
 * and maintains diagnostic tracking for administrators.
 */

import {
  supabase,
  isSupabaseConfigured,
  cleanSupabaseUrl,
} from './supabase';
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import { OrganizationRole } from '../types/database';

export interface InviteUserPayload {
  email: string;
  role: OrganizationRole;
  fullName?: string;
  organizationId: string;
  organizationName: string;
  branchId?: string;
}

export interface InvitationDiagnosticInfo {
  recipient: string;
  timestamp: string;
  organizationId: string;
  stage: string;
  edgeFunctionStatus: 'SUCCESS' | 'ERROR' | 'UNREACHABLE' | 'SKIPPED';
  authAdminStatus: 'DELIVERED_TO_SMTP' | 'REJECTED' | 'RATE_LIMITED' | 'UNKNOWN';
  emailProviderStatus: 'DISPATCHED' | 'FAILED' | 'MANUAL_LINK';
  errorCode?: string;
  errorMessage?: string;
  redirectUrl: string;
}

export interface InvitationResult {
  success: boolean;
  emailSent: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
  invitation?: any;
  inviteLink?: string;
  redirectUrl?: string;
  diagnostic?: InvitationDiagnosticInfo;
}

// In-memory latest diagnostic info for Admin Troubleshooting Panel
let lastInvitationDiagnostic: InvitationDiagnosticInfo | null = null;
const diagnosticListeners: Array<(info: InvitationDiagnosticInfo) => void> = [];

export function getLastInvitationDiagnostic(): InvitationDiagnosticInfo | null {
  if (lastInvitationDiagnostic) return lastInvitationDiagnostic;
  try {
    const stored = localStorage.getItem('h2o_last_invitation_diagnostic');
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export function subscribeToDiagnostic(listener: (info: InvitationDiagnosticInfo) => void): () => void {
  diagnosticListeners.push(listener);
  return () => {
    const idx = diagnosticListeners.indexOf(listener);
    if (idx !== -1) diagnosticListeners.splice(idx, 1);
  };
}

function updateDiagnostic(info: InvitationDiagnosticInfo) {
  lastInvitationDiagnostic = info;
  try {
    localStorage.setItem('h2o_last_invitation_diagnostic', JSON.stringify(info));
  } catch {}
  diagnosticListeners.forEach((l) => l(info));
}

/**
 * Returns environment-aware invitation acceptance URL
 * Production: https://jjesdrowater-mgtsys.netlify.app/accept-invitation
 * Development: http://localhost:3000/accept-invitation (or current preview origin)
 */
export function getInvitationRedirectUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://jjesdrowater-mgtsys.netlify.app/accept-invitation';
  }

  const hostname = window.location.hostname;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('webcontainer') ||
    hostname.includes('run.app'); // AI Studio development sandbox

  if (isLocal) {
    return `${window.location.origin}/accept-invitation`;
  }

  // Production application URL
  return 'https://jjesdrowater-mgtsys.netlify.app/accept-invitation';
}

/**
 * Diagnostic & Error Parser for Supabase Edge Function Invocations
 * Specifically discriminates between FunctionsHttpError, FunctionsRelayError,
 * and FunctionsFetchError without exposing tokens or secrets.
 */
async function parseEdgeFunctionError(
  error: any,
  cleanEmail: string
): Promise<{
  errorMsg: string;
  friendlyError: string;
  errorCode: string;
  stage: string;
  isFetchError: boolean;
}> {
  console.error('[InvitationService] Edge Function invocation error caught:', error);

  let errorMsg = 'Invitation could not be sent.';
  let errorCode = 'INVITATION_FAILED';
  let stage = 'Stage 2: Edge Function';
  let isFetchError = false;

  if (error instanceof FunctionsHttpError) {
    stage = 'Stage 2: Edge Function HTTP Error';
    errorCode = 'EDGE_FUNCTION_HTTP_ERROR';
    console.error('[InvitationService] Encountered FunctionsHttpError (Status:', error.context?.status, ')');

    if (error.context) {
      try {
        const details = await error.context.json();
        console.error('[InvitationService] Parsed Edge Function JSON response:', details);
        if (details?.error) errorMsg = details.error;
        if (details?.message) errorMsg = details.message;
        if (details?.code) errorCode = details.code;
        if (details?.stage) stage = details.stage;
      } catch {
        try {
          const text = await error.context.text();
          console.error('[InvitationService] Parsed Edge Function text response:', text);
          if (text) errorMsg = text;
        } catch {
          console.error('[InvitationService] Could not parse Edge Function response body');
        }
      }
    }
  } else if (error instanceof FunctionsRelayError) {
    stage = 'Stage 2: Supabase Relay Gateway';
    errorCode = 'FUNCTIONS_RELAY_ERROR';
    errorMsg = 'Supabase relay error: The edge function failed to execute on Supabase infrastructure (FunctionsRelayError).';
    console.error('[InvitationService] FunctionsRelayError details:', error);
  } else if (error instanceof FunctionsFetchError) {
    stage = 'Stage 2: Network / Edge Function Reachability';
    errorCode = 'FUNCTIONS_FETCH_ERROR';
    isFetchError = true;
    const innerContext = error.context;
    console.error('[InvitationService] FunctionsFetchError details:', error, 'Inner Context:', innerContext);
    errorMsg =
      'Failed to send a request to the Edge Function. The edge function could not be reached. Please verify that the "invite-user" function is deployed in your Supabase project, is active, and CORS headers allow this domain.';
  } else if (error?.message) {
    errorMsg = error.message;
  }

  // Friendly error mappings for common business scenarios
  let friendlyError = errorMsg;
  const lower = errorMsg.toLowerCase();

  if (
    lower.includes('already belongs to an active staff member') ||
    lower.includes('member_already_exists')
  ) {
    friendlyError = `${cleanEmail} already belongs to an active staff member in this organization.`;
  } else if (
    lower.includes('already belongs to a registered user') ||
    lower.includes('user already exists') ||
    lower.includes('user_already_exists')
  ) {
    friendlyError = 'This email address already belongs to a registered user.';
  } else if (
    lower.includes('already pending') ||
    lower.includes('invitation_pending')
  ) {
    friendlyError = 'An invitation is already pending for this email address.';
  } else if (
    lower.includes('permission') ||
    lower.includes('permission_denied')
  ) {
    friendlyError = 'You do not have permission to invite users to this organization.';
  } else if (
    lower.includes('rate limit') ||
    lower.includes('rate_limit_exceeded')
  ) {
    friendlyError =
      'Email rate limit exceeded (3 emails/hr default). Please wait a few minutes or configure custom SMTP in Supabase Dashboard.';
  } else if (
    lower.includes('smtp') ||
    lower.includes('smtp_delivery_failed') ||
    lower.includes('email delivery failed')
  ) {
    friendlyError =
      'Invitation could not be delivered. Email delivery failed or custom SMTP is not configured in Supabase.';
  } else if (
    lower.includes('unauthorized') ||
    lower.includes('invalid_session') ||
    lower.includes('missing authentication bearer') ||
    lower.includes('re-authenticate')
  ) {
    friendlyError = 'Your session has expired. Please sign in again.';
  }

  return { errorMsg, friendlyError, errorCode, stage, isFetchError };
}

/**
 * Dispatches a secure server-side invitation via Supabase Edge Function
 * Never executes admin inviteUserByEmail from the browser.
 */
export async function sendUserInvitation(payload: InviteUserPayload): Promise<InvitationResult> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const redirectUrl = getInvitationRedirectUrl();
  const timestamp = new Date().toISOString();

  // If Supabase is not configured in this runtime
  if (!isSupabaseConfigured) {
    const diag: InvitationDiagnosticInfo = {
      recipient: cleanEmail,
      timestamp,
      organizationId: payload.organizationId,
      stage: 'Stage 1: Client Environment',
      edgeFunctionStatus: 'SKIPPED',
      authAdminStatus: 'UNKNOWN',
      emailProviderStatus: 'MANUAL_LINK',
      errorCode: 'SUPABASE_NOT_CONFIGURED',
      errorMessage: 'VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not configured.',
      redirectUrl,
    };
    updateDiagnostic(diag);

    const secureToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const fallbackInvite = {
      id: `inv-${Date.now()}`,
      organization_id: payload.organizationId,
      organization_name: payload.organizationName,
      email: cleanEmail,
      role: payload.role,
      token: secureToken,
      branch_id: payload.branchId || null,
      invited_by: 'admin',
      invited_by_name: 'Administrator',
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_at: timestamp,
    };

    return {
      success: false,
      emailSent: false,
      error: 'Supabase cloud authentication is not configured. Invitation email could not be delivered.',
      errorCode: 'SUPABASE_NOT_CONFIGURED',
      invitation: fallbackInvite,
      inviteLink: `${redirectUrl}?token=${secureToken}`,
      redirectUrl,
      diagnostic: diag,
    };
  }

  // 1. VERIFY AUTHENTICATED SUPABASE SESSION BEFORE INVOKING
  // Supabase edge functions require a valid caller session token
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (sessionErr || !session || !session.access_token) {
    console.warn('[sendUserInvitation] No active Supabase session detected:', sessionErr);
    const sessionExpiredMsg = 'Your session has expired. Please sign in again.';
    const diag: InvitationDiagnosticInfo = {
      recipient: cleanEmail,
      timestamp,
      organizationId: payload.organizationId,
      stage: 'Stage 1: Session Verification',
      edgeFunctionStatus: 'SKIPPED',
      authAdminStatus: 'UNKNOWN',
      emailProviderStatus: 'FAILED',
      errorCode: 'SESSION_EXPIRED',
      errorMessage: sessionExpiredMsg,
      redirectUrl,
    };
    updateDiagnostic(diag);

    return {
      success: false,
      emailSent: false,
      error: sessionExpiredMsg,
      errorCode: 'SESSION_EXPIRED',
      redirectUrl,
      diagnostic: diag,
    };
  }

  try {
    // 2. Invoke secure server-side Edge Function 'invite-user'
    // Pass session access token in Authorization header
    const { data, error } = await supabase.functions.invoke('invite-user', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        email: cleanEmail,
        role: payload.role,
        fullName: payload.fullName || cleanEmail.split('@')[0],
        organizationId: payload.organizationId,
        full_name: payload.fullName || cleanEmail.split('@')[0],
        organization_id: payload.organizationId,
        branch_id: payload.branchId,
        branchId: payload.branchId,
        redirect_to: redirectUrl,
        redirectTo: redirectUrl,
      },
    });

    // 3. Handle Edge Function Invocation Errors (Separate Handling for FunctionsFetchError, FunctionsRelayError, FunctionsHttpError)
    if (error) {
      const { errorMsg, friendlyError, errorCode, stage, isFetchError } =
        await parseEdgeFunctionError(error, cleanEmail);

      const diag: InvitationDiagnosticInfo = {
        recipient: cleanEmail,
        timestamp,
        organizationId: payload.organizationId,
        stage,
        edgeFunctionStatus: isFetchError ? 'UNREACHABLE' : 'ERROR',
        authAdminStatus: errorCode === 'RATE_LIMIT_EXCEEDED' ? 'RATE_LIMITED' : 'REJECTED',
        emailProviderStatus: 'FAILED',
        errorCode,
        errorMessage: errorMsg,
        redirectUrl,
      };
      updateDiagnostic(diag);

      return {
        success: false,
        emailSent: false,
        error: friendlyError,
        errorCode,
        redirectUrl,
        diagnostic: diag,
      };
    }

    // 3. Handle Edge Function Business Success
    if (data?.success) {
      const diag: InvitationDiagnosticInfo = {
        recipient: cleanEmail,
        timestamp,
        organizationId: payload.organizationId,
        stage: 'Stage 4: SMTP / Email Provider Hand-off',
        edgeFunctionStatus: 'SUCCESS',
        authAdminStatus: 'DELIVERED_TO_SMTP',
        emailProviderStatus: 'DISPATCHED',
        redirectUrl: data.redirect_url || redirectUrl,
      };
      updateDiagnostic(diag);

      return {
        success: true,
        emailSent: true,
        message: data.message || `Invitation email dispatched successfully to ${cleanEmail}. Check inbox and spam folder.`,
        invitation: data.invitation,
        inviteLink: data.invite_link,
        redirectUrl: data.redirect_url || redirectUrl,
        diagnostic: diag,
      };
    }

    // 4. Handle Edge Function Error in payload
    if (data?.error) {
      const diag: InvitationDiagnosticInfo = {
        recipient: cleanEmail,
        timestamp,
        organizationId: payload.organizationId,
        stage: data.stage || 'Stage 2: Edge Function',
        edgeFunctionStatus: 'ERROR',
        authAdminStatus: 'REJECTED',
        emailProviderStatus: 'FAILED',
        errorCode: data.code || 'EDGE_FUNCTION_ERROR',
        errorMessage: data.error,
        redirectUrl,
      };
      updateDiagnostic(diag);

      return {
        success: false,
        emailSent: false,
        error: data.error,
        errorCode: data.code,
        diagnostic: diag,
      };
    }

    // Unrecognized response
    return {
      success: false,
      emailSent: false,
      error: 'Unexpected server response received from invitation service.',
      diagnostic: {
        recipient: cleanEmail,
        timestamp,
        organizationId: payload.organizationId,
        stage: 'Stage 2: Response Parsing',
        edgeFunctionStatus: 'ERROR',
        authAdminStatus: 'UNKNOWN',
        emailProviderStatus: 'FAILED',
        redirectUrl,
      },
    };
  } catch (err: any) {
    console.error('[sendUserInvitation] Network or client exception:', err);
    const diag: InvitationDiagnosticInfo = {
      recipient: cleanEmail,
      timestamp,
      organizationId: payload.organizationId,
      stage: 'Stage 1: Frontend Client Exception',
      edgeFunctionStatus: 'UNREACHABLE',
      authAdminStatus: 'UNKNOWN',
      emailProviderStatus: 'FAILED',
      errorMessage: err?.message || String(err),
      redirectUrl,
    };
    updateDiagnostic(diag);

    return {
      success: false,
      emailSent: false,
      error: err?.message || 'Invitation could not be sent. Please check your network connection.',
      diagnostic: diag,
    };
  }
}

/**
 * Resends an existing pending invitation via secure server-side Edge Function
 */
export async function resendUserInvitation(
  invitationId: string,
  email: string,
  organizationId: string
): Promise<InvitationResult> {
  const cleanEmail = email.trim().toLowerCase();
  const redirectUrl = getInvitationRedirectUrl();
  const timestamp = new Date().toISOString();

  if (!isSupabaseConfigured) {
    return {
      success: false,
      emailSent: false,
      error: 'Supabase cloud authentication is not configured. Cannot resend email.',
    };
  }

  // 1. Verify authenticated Supabase session
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (sessionErr || !session || !session.access_token) {
    console.warn('[resendUserInvitation] No active Supabase session detected:', sessionErr);
    const sessionExpiredMsg = 'Your session has expired. Please sign in again.';
    const diag: InvitationDiagnosticInfo = {
      recipient: cleanEmail,
      timestamp,
      organizationId,
      stage: 'Stage 1: Session Verification',
      edgeFunctionStatus: 'SKIPPED',
      authAdminStatus: 'UNKNOWN',
      emailProviderStatus: 'FAILED',
      errorCode: 'SESSION_EXPIRED',
      errorMessage: sessionExpiredMsg,
      redirectUrl,
    };
    updateDiagnostic(diag);

    return {
      success: false,
      emailSent: false,
      error: sessionExpiredMsg,
      errorCode: 'SESSION_EXPIRED',
      diagnostic: diag,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        email: cleanEmail,
        organizationId,
        organization_id: organizationId,
        redirect_to: redirectUrl,
        redirectTo: redirectUrl,
        is_resend: true,
        isResend: true,
      },
    });

    if (error) {
      const { errorMsg, friendlyError, errorCode, stage, isFetchError } =
        await parseEdgeFunctionError(error, cleanEmail);

      const diag: InvitationDiagnosticInfo = {
        recipient: cleanEmail,
        timestamp,
        organizationId,
        stage: `Stage 2: Resend - ${stage}`,
        edgeFunctionStatus: isFetchError ? 'UNREACHABLE' : 'ERROR',
        authAdminStatus: 'REJECTED',
        emailProviderStatus: 'FAILED',
        errorCode,
        errorMessage: errorMsg,
        redirectUrl,
      };
      updateDiagnostic(diag);

      return {
        success: false,
        emailSent: false,
        error: friendlyError,
        errorCode,
        diagnostic: diag,
      };
    }

    if (data?.success) {
      const diag: InvitationDiagnosticInfo = {
        recipient: cleanEmail,
        timestamp,
        organizationId,
        stage: 'Stage 4: Resend SMTP Delivery',
        edgeFunctionStatus: 'SUCCESS',
        authAdminStatus: 'DELIVERED_TO_SMTP',
        emailProviderStatus: 'DISPATCHED',
        redirectUrl: data.redirect_url || redirectUrl,
      };
      updateDiagnostic(diag);

      // Refresh database record expiry
      const newExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      try {
        await supabase
          .from('invitations')
          .update({ expires_at: newExpiresAt, status: 'pending' })
          .eq('id', invitationId);
      } catch (dbErr) {
        console.warn('DB update note on resend:', dbErr);
      }

      return {
        success: true,
        emailSent: true,
        message: data.message || `Invitation email resent successfully to ${cleanEmail}.`,
        invitation: data.invitation,
        inviteLink: data.invite_link,
        diagnostic: diag,
      };
    }

    return {
      success: false,
      emailSent: false,
      error: data?.error || 'Failed to resend invitation email.',
    };
  } catch (err: any) {
    return {
      success: false,
      emailSent: false,
      error: err?.message || 'Failed to resend invitation due to network error.',
    };
  }
}

/**
 * Verifies an invitation token from URL or email link
 */
export async function inspectInvitationToken(token: string): Promise<{
  valid: boolean;
  expired?: boolean;
  error?: string;
  invitation?: any;
}> {
  if (!token) {
    return { valid: false, error: 'Missing invitation token.' };
  }

  try {
    if (isSupabaseConfigured) {
      // Query invitations table by token or id
      const { data, error } = await supabase
        .from('invitations')
        .select('*, organizations(id, name, currency, country)')
        .or(`token.eq.${token},id.eq.${token}`)
        .maybeSingle();

      if (data) {
        const isExpired = new Date(data.expires_at).getTime() < Date.now();
        if (isExpired) {
          return {
            valid: false,
            expired: true,
            error: 'This invitation has expired. Please ask your administrator to send a new invitation.',
            invitation: data,
          };
        }

        if (data.status === 'accepted') {
          return {
            valid: false,
            error: 'This invitation has already been accepted. Please sign in with your password.',
            invitation: data,
          };
        }

        if (data.status === 'revoked') {
          return {
            valid: false,
            error: 'This invitation has been revoked by the administrator.',
            invitation: data,
          };
        }

        return {
          valid: true,
          invitation: data,
        };
      }
    }

    // Check localStorage fallback
    const stored = localStorage.getItem('h2o_erp_v2_invitations') || localStorage.getItem('aquaflow_erp_invitations');
    if (stored) {
      const parsed = JSON.parse(stored);
      const matched = Array.isArray(parsed)
        ? parsed.find((i: any) => i.token === token || i.id === token)
        : null;

      if (matched) {
        const isExpired = new Date(matched.expires_at).getTime() < Date.now();
        if (isExpired) {
          return {
            valid: false,
            expired: true,
            error: 'This invitation has expired. Please ask your administrator to send a new invitation.',
            invitation: matched,
          };
        }
        return { valid: true, invitation: matched };
      }
    }

    return { valid: false, error: 'Invitation not found or link is invalid.' };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Error inspecting invitation token.' };
  }
}
