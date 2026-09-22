import React, { useState, useEffect } from 'react';
import {
  Droplet,
  Eye,
  EyeOff,
  ShieldCheck,
  Factory,
  Warehouse,
  ShoppingCart,
  Calculator,
  Mail,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { SubscriptionPlanId } from '../../types/database';
import { authService } from '../../lib/auth';

export function AuthPage() {
  const {
    loginUser,
    registerOrganization,
    acceptInvitation,
    invitations,
  } = useERPStore();

  // Mode: 'signin' | 'register_company' | 'forgot_password' | 'reset_password' | 'accept_invite'
  const [authMode, setAuthMode] = useState<
    'signin' | 'register_company' | 'forgot_password' | 'reset_password' | 'accept_invite'
  >('signin');

  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Password State for Reset Password Mode
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Invitation Accept State
  const [inviteToken, setInviteToken] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDetails, setInviteDetails] = useState<{
    organizationName?: string;
    role?: string;
    email?: string;
    invitedByName?: string;
  } | null>(null);

  // Company Onboarding State (Multi-step wizard)
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('United States');
  const [currency, setCurrency] = useState('USD');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('professional');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  // Check URL query parameters, path or hash on mount
  useEffect(() => {
    const hash = window.location.hash || '';
    const searchParams = new URLSearchParams(window.location.search);
    const pathMatch = window.location.pathname.match(/\/invite\/([^/?#]+)/);
    const pathToken = pathMatch ? pathMatch[1] : null;
    const queryToken = searchParams.get('token');

    if (hash.includes('reset-password') || hash.includes('type=recovery')) {
      setAuthMode('reset_password');
    } else if (pathToken || queryToken || hash.includes('invite')) {
      const token = pathToken || queryToken || (hash.match(/token=([^&]+)/)?.[1] ?? '');
      if (token) {
        setInviteToken(token);
        setAuthMode('accept_invite');

        const matched = invitations.find((i) => i.token === token);
        if (matched) {
          setInviteDetails({
            organizationName: matched.organization_name || 'AquaFlow Demo Water Company',
            role: matched.role,
            email: matched.email,
            invitedByName: matched.invited_by_name,
          });
        }
      }
    }
  }, [invitations]);

  // Fill default owner credentials
  const handleQuickFillOwner = () => {
    setEmail('owner@aquaflow.local');
    setPassword('ChangeMe123!');
    setErrorMsg(null);
  };

  // Standard Login Submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await loginUser(email, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Submit
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const exists = authService.verifyUserExists(email);
    setLoading(false);

    if (exists) {
      setResetEmail(email);
      setSuccessMsg('Account verified. Please set your new password below.');
      setAuthMode('reset_password');
    } else {
      setErrorMsg('No account found with this email address. Please check your spelling or register.');
    }
  };

  // Update Password Submit
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    const targetEmail = resetEmail || email;
    const res = await authService.resetPasswordLocally(targetEmail, newPassword);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Password updated successfully! Signing you into your workspace...');
      setTimeout(async () => {
        await loginUser(targetEmail, newPassword);
      }, 700);
    } else {
      setErrorMsg(res.error || 'Failed to update password.');
    }
  };

  // Accept Invite Submit
  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await acceptInvitation(inviteToken, inviteName, password);
    if (res.success) {
      window.location.hash = '';
    } else {
      setErrorMsg(res.error || 'Invalid or expired invitation token.');
    }
    setLoading(false);
  };

  // Register Company Submit
  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await registerOrganization({
        companyName,
        country,
        city: 'Industrial Valley',
        currency,
        planId: selectedPlan,
        email: ownerEmail,
        ownerName,
        ownerPassword,
      });

      if (res && res.success) {
        setSuccessMsg('Workspace created! Taking you to plant operations...');
      } else {
        setErrorMsg('Failed to register company.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="auth-page-root"
      className="auth-page-root min-h-screen w-full flex flex-col lg:flex-row relative bg-[#020d24] text-slate-100 selection:bg-blue-500 selection:text-white font-sans antialiased overflow-x-hidden"
    >
      {/* =========================================================================
          BACKGROUND FOR LEFT BANNER & GENERAL PAGE:
          1. Deep sapphire and cobalt ocean water with brilliant sunlit surface bokeh
          2. Glistening wet dark basalt / volcanic coastal rock with macro water droplets
          3. Saturated sapphire daylight tones
         ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Layer 1: Deep Sapphire Ocean Water with glistening waves & sunlight glitter */}
        <img
          src="https://images.unsplash.com/photo-1468581264429-2548ef9eb732?auto=format&fit=crop&w=2400&q=88"
          alt="Deep ocean water"
          className="w-full h-full object-cover object-top filter brightness-[0.92] contrast-[1.22] saturate-[1.3]"
          referrerPolicy="no-referrer"
        />

        {/* Layer 2: Wet Dark Basalt Rock with Macro Water Droplets */}
        <div className="absolute inset-0 mix-blend-hard-light opacity-90">
          <img
            src="https://images.unsplash.com/photo-1520690214124-2405c5217036?auto=format&fit=crop&w=2400&q=88"
            alt="Wet dark rock with glistening water droplets"
            className="w-full h-full object-cover object-center filter contrast-[1.32] brightness-[0.9]"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Layer 3: Specular Water Droplets and Glistening Texture Overlay */}
        <div className="absolute inset-0 mix-blend-overlay opacity-65">
          <img
            src="https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?auto=format&fit=crop&w=2400&q=85"
            alt="Water droplets on stone"
            className="w-full h-full object-cover object-bottom filter contrast-[1.4]"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Sapphire Blue Color Wash */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#011a47]/90 via-[#01358d]/55 to-[#0052cc]/30 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#003893]/40 via-transparent to-[#011438]/75" />

        {/* Oceanic Bokeh Sparks */}
        <div className="absolute -top-16 right-10 w-[42rem] h-[42rem] bg-sky-300/35 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/4 -left-20 w-[34rem] h-[34rem] bg-blue-500/25 rounded-full blur-[90px] pointer-events-none" />
      </div>

      {/* =========================================================================
          LEFT COLUMN: USER'S ORIGINAL INTERFACE (AquaFlow ERP Hero Banner)
         ========================================================================= */}
      <div className="auth-left-banner w-full lg:w-[50%] p-8 lg:p-14 flex flex-col justify-between relative z-10 overflow-hidden backdrop-blur-md bg-gradient-to-b from-[#011f4d]/85 via-[#011536]/80 to-[#010c21]/90 border-b lg:border-b-0 lg:border-r border-white/15">
        {/* Brand Header */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg shadow-black/20">
              <Droplet className="w-7 h-7 text-white fill-current drop-shadow" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
                AquaFlow ERP
              </h1>
              <p className="text-xs text-sky-200 font-medium tracking-wide">
                H2O Bottling & Operations Management
              </p>
            </div>
          </div>
        </div>

        {/* Center Content: Your original feature grid */}
        <div className="relative z-10 my-10 lg:my-0 space-y-6">
          <p className="text-base sm:text-lg text-sky-100/95 max-w-md leading-relaxed font-medium drop-shadow-xs">
            Unify reverse-osmosis telemetry, high-speed bottling lines, warehouse batches, and sales dispatching into one seamless operating system.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 max-w-md">
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-colors shadow-xs">
              <Factory className="w-5 h-5 text-sky-300 mb-1.5" />
              <div className="text-xs font-bold text-white">Plant Operations</div>
              <div className="text-[11px] text-sky-200">Batches, lines & QC</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-colors shadow-xs">
              <Warehouse className="w-5 h-5 text-sky-300 mb-1.5" />
              <div className="text-xs font-bold text-white">Warehouse & Inventory</div>
              <div className="text-[11px] text-sky-200">Pallets, caps & preforms</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-colors shadow-xs">
              <ShoppingCart className="w-5 h-5 text-sky-300 mb-1.5" />
              <div className="text-xs font-bold text-white">Commercial POS</div>
              <div className="text-[11px] text-sky-200">Invoicing & credit terms</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-colors shadow-xs">
              <Calculator className="w-5 h-5 text-sky-300 mb-1.5" />
              <div className="text-xs font-bold text-white">Financial Controls</div>
              <div className="text-[11px] text-sky-200">P&L, expenses & audits</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-sky-200/80 flex items-center justify-between border-t border-white/15 pt-4">
          <span>Self-contained local architecture</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Ready
          </span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: ONLY THIS SECTION WITH WHITE BACKGROUND & SEA BLUE WATER DROPS
          - Pure crisp white surface
          - Translucent sea blue liquid droplets of varying sizes with caustic refractions
          - Specular glossy highlights and soft oceanic drop shadows
          - Crisp, high-contrast dark typography and sleek input fields
         ========================================================================= */}
      <div className="auth-right-form w-full lg:w-[50%] p-6 sm:p-12 lg:p-16 flex flex-col justify-center relative z-10 bg-white text-slate-800 overflow-y-auto">
        {/* =======================================================================
            CLEAN WHITE BACKGROUND (WATERMARK DESIGN REMOVED)
           ======================================================================= */}
        <div className="w-full max-w-md mx-auto space-y-6 relative z-10">

          {/* Feedback alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2.5 animate-fadeIn shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="flex-1 font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5 animate-fadeIn shadow-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="flex-1 font-medium">{successMsg}</span>
            </div>
          )}

          {/* VIEW 1: SIGN IN (Matches the attached screenshot with white & sea blue drops background) */}
          {authMode === 'signin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Welcome to AquaFlow ERP
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Enter your operator credentials to access your water manufacturing workspace.
                </p>
              </div>

              {/* Development quick-fill helper */}
              <div className="p-3 rounded-xl bg-white/90 border border-sky-200 shadow-sm flex items-center justify-between gap-3 text-xs backdrop-blur-xs">
                <div className="min-w-0">
                  <div className="text-blue-900 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Default Owner Account
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    owner@aquaflow.local &bull; ChangeMe123!
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickFillOwner}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors whitespace-nowrap shrink-0"
                >
                  Quick Fill
                </button>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="owner@aquaflow.local"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/95 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 shadow-xs transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setAuthMode('forgot_password');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/95 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 shadow-xs transition-all pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Enter Workspace'
                  )}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-600">
                  New company?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthMode('register_company');
                    }}
                    className="text-blue-600 hover:text-blue-700 hover:underline font-semibold cursor-pointer ml-1"
                  >
                    Register New Workspace
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* VIEW 2: DEDICATED PASSWORD RESET SCREEN */}
          {authMode === 'reset_password' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Set New Account Password
                </h2>
                <p className="text-xs text-slate-600">
                  Account: <span className="text-blue-600 font-mono font-semibold">{resetEmail || email}</span>
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/95 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/95 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 shadow-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    'Save New Password & Enter'
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="w-full text-center text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </div>
          )}

          {/* VIEW 3: FORGOT PASSWORD REQUEST SCREEN */}
          {authMode === 'forgot_password' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Reset Account Password
                </h2>
                <p className="text-xs text-slate-600">
                  Enter your registered work email to verify and reset your workspace password.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="owner@aquaflow.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/95 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 shadow-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    'Verify Account & Set Password'
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="w-full text-center text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </div>
          )}

          {/* VIEW 4: ACCEPT INVITATION SCREEN */}
          {authMode === 'accept_invite' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-2">
                  <Mail className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Join Workspace Team
                </h2>
                <p className="text-xs text-slate-600">
                  You have been invited to collaborate in a water manufacturing workspace. Set your password to enter.
                </p>
              </div>

              {inviteDetails && (
                <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200 space-y-1.5 text-xs shadow-xs">
                  <div className="text-slate-600 flex items-center justify-between">
                    <span>Target Workspace:</span>
                    <strong className="text-slate-900 font-semibold">{inviteDetails.organizationName}</strong>
                  </div>
                  {inviteDetails.role && (
                    <div className="text-slate-600 flex items-center justify-between">
                      <span>Assigned Role:</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold capitalize">
                        {inviteDetails.role.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  {inviteDetails.email && (
                    <div className="text-slate-600 flex items-center justify-between">
                      <span>Invited Email:</span>
                      <span className="text-slate-500 font-mono text-[11px]">{inviteDetails.email}</span>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleAcceptInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Marcus Vance"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/95 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Create Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/95 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 shadow-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    'Accept Invitation & Enter'
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="w-full text-center text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </div>
          )}

          {/* VIEW 5: MULTI-STEP COMPANY REGISTRATION */}
          {authMode === 'register_company' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Register Company Workspace
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Create a dedicated manufacturing tenant with plant, warehouse, and accounting modules.
                </p>
              </div>

              {/* Stepper Header */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${onboardingStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                  <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">1</span>
                  Company
                </div>
                <div className="w-8 h-px bg-slate-200" />
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${onboardingStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                  <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">2</span>
                  Plan
                </div>
                <div className="w-8 h-px bg-slate-200" />
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${onboardingStep >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
                  <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">3</span>
                  Owner
                </div>
              </div>

              <form onSubmit={handleRegisterCompany} className="space-y-4">
                {onboardingStep === 1 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="AquaFlow Demo Water Company"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Currency
                        </label>
                        <input
                          type="text"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!companyName.trim()}
                      onClick={() => setOnboardingStep(2)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2 shadow-sm"
                    >
                      Continue to Plan Selection <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {onboardingStep === 2 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="space-y-2">
                      {[
                        { id: 'starter', name: 'Starter', price: '$29/mo', desc: '1 Plant, 3 Users, 50,000 units/mo' },
                        { id: 'professional', name: 'Professional (Recommended)', price: '$79/mo', desc: '3 Plants, 15 Users, 500,000 units/mo' },
                        { id: 'enterprise', name: 'Enterprise Multi-Plant', price: '$199/mo', desc: 'Unlimited Plants & Users' },
                      ].map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id as SubscriptionPlanId)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            selectedPlan === plan.id
                              ? 'bg-blue-50/80 border-blue-600 text-slate-900 ring-2 ring-blue-500/20 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold">{plan.name}</div>
                            <div className="text-[11px] text-slate-500">{plan.desc}</div>
                          </div>
                          <div className="text-xs font-mono font-bold text-blue-600">{plan.price}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOnboardingStep(1)}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardingStep(3)}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        Continue to Owner Details <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {onboardingStep === 3 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Owner Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="AquaFlow Owner"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Owner Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="owner@aquaflow.local"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Owner Password *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="At least 6 characters"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setOnboardingStep(2)}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !ownerEmail || !ownerPassword || !ownerName}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          'Complete Workspace Setup'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 cursor-pointer mx-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Already have an account? Sign In
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default AuthPage;
