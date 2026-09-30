import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  UserCheck,
  ArrowRight,
  Droplets,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { inspectInvitationToken } from '../lib/invitationService';
import { useERPStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { UserRole } from '../types/database';

export function AcceptInvitationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const store = useERPStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Invitation Context
  const [inviteDetails, setInviteDetails] = useState<{
    email: string;
    organizationId: string;
    organizationName: string;
    role: string;
    branchId?: string;
    token?: string;
    userId?: string;
  } | null>(null);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function resolveInvitation() {
      setLoading(true);
      setErrorMsg(null);
      setIsExpired(false);

      try {
        // 1. Check for URL parameters
        const searchParams = new URLSearchParams(location.search);
        const queryToken = searchParams.get('token');
        const code = searchParams.get('code');
        const hash = window.location.hash || '';

        // Check for Supabase Auth hash tokens (#access_token=...&type=invite) or PKCE code
        let authSessionUser: any = null;
        if (isSupabaseConfigured) {
          if (code) {
            try {
              const { data: exData } = await supabase.auth.exchangeCodeForSession(code);
              if (exData?.user) authSessionUser = exData.user;
            } catch (exErr) {
              console.warn('PKCE code exchange note:', exErr);
            }
          }

          if (!authSessionUser) {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              authSessionUser = sessionData.session.user;
            } else if (hash.includes('access_token')) {
              await new Promise((r) => setTimeout(r, 250));
              const { data: retrySession } = await supabase.auth.getSession();
              if (retrySession?.session?.user) {
                authSessionUser = retrySession.session.user;
              }
            }
          }
        }

        // Case A: Supabase Auth direct invite session established from email link
        if (authSessionUser && (authSessionUser.user_metadata?.organization_id || hash.includes('type=invite'))) {
          const meta = authSessionUser.user_metadata || {};
          const orgId = meta.organization_id || 'org-default';
          const orgName = meta.organization_name || 'H2O Workspace';
          const role = meta.role || 'operator';
          const email = authSessionUser.email || '';

          if (isMounted) {
            setInviteDetails({
              email,
              organizationId: orgId,
              organizationName: orgName,
              role,
              branchId: meta.branch_id,
              userId: authSessionUser.id,
            });
            if (meta.full_name) {
              setFullName(meta.full_name);
            }
            setLoading(false);
          }
          return;
        }

        // Case B: Query Token (?token=...) or token in URL
        const tokenToInspect = queryToken || (hash.match(/token=([^&]+)/)?.[1] ?? '');

        if (tokenToInspect) {
          const inspection = await inspectInvitationToken(tokenToInspect);
          if (!isMounted) return;

          if (inspection.valid && inspection.invitation) {
            const inv = inspection.invitation;
            setInviteDetails({
              email: inv.email,
              organizationId: inv.organization_id,
              organizationName: inv.organizations?.name || inv.organization_name || 'H2O Workspace',
              role: inv.role || 'operator',
              branchId: inv.branch_id,
              token: tokenToInspect,
            });
            if (inv.invited_by_name) {
              setFullName(inv.email.split('@')[0]);
            }
            setLoading(false);
            return;
          }

          if (inspection.expired) {
            setIsExpired(true);
            setErrorMsg(
              'This invitation has expired. Please ask your administrator to send a new invitation.'
            );
            setLoading(false);
            return;
          }

          setErrorMsg(inspection.error || 'Invitation is invalid or has already been accepted.');
          setLoading(false);
          return;
        }

        if (isMounted) {
          setErrorMsg('No valid invitation link or token was detected. Please click the invitation link from your email.');
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err?.message || 'Failed to verify invitation.');
          setLoading(false);
        }
      }
    }

    resolveInvitation();

    return () => {
      isMounted = false;
    };
  }, [location, isSupabaseConfigured, store.invitations]);

  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteDetails) return;

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let finalUserId = inviteDetails.userId;

      // 1. If user has active session via Supabase Auth email invite link:
      if (isSupabaseConfigured) {
        const { data: userResp, error: updateError } = await supabase.auth.updateUser({
          password: password,
          data: {
            full_name: fullName.trim(),
            organization_id: inviteDetails.organizationId,
            role: inviteDetails.role,
            branch_id: inviteDetails.branchId,
          },
        });

        if (userResp?.user) {
          finalUserId = userResp.user.id;
        } else if (updateError) {
          // If session was not active, try signing up or local accept
          console.warn('Update user note:', updateError);
        }
      }

      // Generate a user ID if not established
      if (!finalUserId) {
        finalUserId = `user-${Date.now()}`;
      }

      // 2. Insert or update organization_members in Supabase database
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('organization_members')
            .upsert({
              organization_id: inviteDetails.organizationId,
              user_id: finalUserId,
              role: inviteDetails.role,
              full_name: fullName.trim(),
              email: inviteDetails.email.toLowerCase(),
              branch_id: inviteDetails.branchId || null,
              is_active: true,
              joined_at: new Date().toISOString(),
            });
        } catch (err) {
          console.warn('organization_members upsert note:', err);
        }

        // Insert or update user_profiles
        try {
          await supabase
            .from('user_profiles')
            .upsert({
              id: finalUserId,
              organization_id: inviteDetails.organizationId,
              role: inviteDetails.role,
              full_name: fullName.trim(),
              email: inviteDetails.email.toLowerCase(),
              branch_id: inviteDetails.branchId || null,
              is_active: true,
              updated_at: new Date().toISOString(),
            });
        } catch (err) {
          console.warn('user_profiles upsert note:', err);
        }

        // Mark invitation as accepted
        if (inviteDetails.token) {
          try {
            await supabase
              .from('invitations')
              .update({ status: 'accepted', accepted_at: new Date().toISOString() })
              .or(`token.eq.${inviteDetails.token},email.eq.${inviteDetails.email.toLowerCase()}`);
          } catch (err) {
            console.warn('invitation update note:', err);
          }
        }
      }

      // 3. Update in-memory application store
      if (typeof store.acceptInvitation === 'function' && inviteDetails.token) {
        await store.acceptInvitation(inviteDetails.token, fullName.trim(), password);
      } else {
        // Fallback store state update
        const newUser = {
          id: finalUserId,
          email: inviteDetails.email,
          full_name: fullName.trim(),
          role: inviteDetails.role as UserRole,
          organization_id: inviteDetails.organizationId,
          branch_id: inviteDetails.branchId || 'branch-1',
          is_active: true,
          created_at: new Date().toISOString(),
        };

        const targetOrg =
          store.organizations.find((o) => o.id === inviteDetails.organizationId) ||
          store.currentOrganization;

        // Persist local session
        localStorage.setItem('h2o_erp_v2_user', JSON.stringify(newUser));
        localStorage.setItem('h2o_erp_v2_role', inviteDetails.role);
        localStorage.setItem('h2o_erp_v2_auth', 'true');
        localStorage.setItem('h2o_erp_v2_current_org', JSON.stringify(targetOrg));
      }

      setSuccessMsg('Account activated successfully! Entering your workspace...');

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to complete account activation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4 font-sans text-slate-100">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-1">
            <Droplets className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            H2O Water Management System
          </h1>
          <p className="text-xs text-slate-400">
            Workspace Invitation & Team Account Setup
          </p>
        </div>

        {/* Loading Screen */}
        {loading && (
          <Card className="p-8 text-center space-y-4 bg-slate-800/80 border border-slate-700">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-300 font-medium">
              Verifying your invitation details...
            </p>
          </Card>
        )}

        {/* Expired / Error State */}
        {!loading && (isExpired || (errorMsg && !inviteDetails)) && (
          <Card className="p-6 bg-slate-800/90 border border-rose-800/60 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  {isExpired ? 'Invitation Expired' : 'Invalid Invitation'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {errorMsg || 'This invitation has expired. Please ask your administrator to send a new invitation.'}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
              <Link
                to="/login"
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
              >
                ← Return to Login
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Main Invitation Setup Card */}
        {!loading && inviteDetails && (
          <Card className="bg-slate-800/90 border border-slate-700 shadow-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-sky-950/60 to-slate-900 border-b border-slate-700/80 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                    Workspace Invitation
                  </span>
                  <CardTitle className="text-lg text-white font-black mt-0.5">
                    Join {inviteDetails.organizationName}
                  </CardTitle>
                </div>
                <Badge variant="primary" size="md">
                  {inviteDetails.role.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Invitation Reassurance Box */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Invited Email:</span>
                  <span className="font-mono font-bold text-slate-200">{inviteDetails.email}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Company / Organization:</span>
                  <span className="font-bold text-white">{inviteDetails.organizationName}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Assigned Workspace Role:</span>
                  <span className="font-bold text-sky-400 capitalize">
                    {inviteDetails.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Password & Name Setup Form */}
              <form onSubmit={handleActivateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-400" />
                    Your Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-sky-400" />
                    Set Account Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                    Confirm Password
                  </label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={submitting}
                  className="w-full text-xs font-bold py-3 mt-2 shadow-lg shadow-sky-500/20"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Activating Account & Logging In...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Activate Account & Enter Workspace
                    </>
                  )}
                </Button>
              </form>

              <div className="text-center pt-2">
                <span className="text-[11px] text-slate-400">
                  Already have an active account?{' '}
                  <Link to="/login" className="text-sky-400 hover:underline font-semibold">
                    Sign in here
                  </Link>
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
