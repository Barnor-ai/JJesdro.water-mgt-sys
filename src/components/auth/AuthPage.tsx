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
  Sparkles,
  Building2,
  Lock,
  Mail,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Globe,
  DollarSign,
  User,
  KeyRound,
  FileCheck,
  Check,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { SubscriptionPlanId, UserRole } from '../../types/database';
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
  const [tradingName, setTradingName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [country, setCountry] = useState('United States');
  const [city, setCity] = useState('Industrial Valley');
  const [currency, setCurrency] = useState('USD');
  const [phone, setPhone] = useState('');
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

  // Forgot Password Submit (Verifies local account exists)
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

  // Reset Password Submit
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    const targetEmail = resetEmail || email;
    const res = await authService.resetPasswordLocally(targetEmail, newPassword);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Your password has been updated securely. You can now sign in with your new password.');
      setPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setAuthMode('signin');
      }, 1200);
    } else {
      setErrorMsg(res.error || 'Failed to update password.');
    }
  };

  // Company Onboarding Submit
  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await registerOrganization({
        companyName: companyName || 'AquaFlow Demo Water Company',
        tradingName: tradingName || companyName || 'AquaFlow Pure Water',
        regNumber,
        taxId,
        country,
        city,
        currency,
        phone,
        planId: selectedPlan,
        email: ownerEmail,
        ownerName,
        ownerPassword,
      });

      if (!res.success) {
        setErrorMsg((res as any).error || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during company workspace creation.');
    } finally {
      setLoading(false);
    }
  };

  // Accept Invitation Submit
  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const res = await acceptInvitation(inviteToken, password, inviteName);
    if (!res.success) {
      setErrorMsg(res.error || 'Invalid or expired invitation token.');
    }
    setLoading(false);
  };

  return (
    <div
      id="auth-page-root"
      className="auth-page-root min-h-screen w-full flex flex-col lg:flex-row bg-[#080d1a] text-slate-100 selection:bg-blue-500 selection:text-white font-sans antialiased"
    >
      {/* LEFT COLUMN: Deep blue hero banner */}
      <div className="auth-left-banner w-full lg:w-[50%] p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0066fe] via-[#0256d6] to-[#043eb3]">
        {/* Glow Ambient Overlays */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg shadow-black/10">
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

        {/* Center Content */}
        <div className="relative z-10 my-10 lg:my-0 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-sky-100">
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            Standalone System Engine Online
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Next-generation industrial software for bottled water manufacturers.
          </h2>

          <p className="text-sm text-sky-100/90 max-w-md leading-relaxed">
            Unify reverse-osmosis telemetry, high-speed bottling lines, warehouse batches, and sales dispatching into one seamless operating system.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 max-w-md">
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <Factory className="w-5 h-5 text-sky-300 mb-1.5" />
              <div className="text-xs font-bold text-white">Plant Operations</div>
              <div className="text-[11px] text-sky-200">Batches, lines & QC</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <Warehouse className="w-5 h-5 text-sky-300 mb-1.5" />
              <div className="text-xs font-bold text-white">Warehouse & Inventory</div>
              <div className="text-[11px] text-sky-200">Pallets, caps & preforms</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <ShoppingCart className="w-5 h-5 text-sky-300 mb-1.5" />
              <div className="text-xs font-bold text-white">Commercial POS</div>
              <div className="text-[11px] text-sky-200">Invoicing & credit terms</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
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

      {/* RIGHT COLUMN: Interactive Form Column */}
      <div className="auth-right-form w-full lg:w-[50%] p-6 sm:p-12 lg:p-16 flex flex-col justify-center bg-[#070b14] overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-6">

          {/* Feedback alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1 font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="flex-1 font-medium">{successMsg}</span>
            </div>
          )}

          {/* VIEW 1: SIGN IN */}
          {authMode === 'signin' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Welcome to AquaFlow ERP
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your operator credentials to access your water manufacturing workspace.
                </p>
              </div>

              {/* Development quick-fill helper */}
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="text-blue-300 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    Default Owner Account
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    owner@aquaflow.local &bull; ChangeMe123!
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickFillOwner}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  Quick Fill
                </button>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="owner@aquaflow.local"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setAuthMode('forgot_password');
                      }}
                      className="text-xs text-blue-400 hover:underline cursor-pointer"
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
                      className="w-full px-4 py-3 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Enter Workspace'
                  )}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-800/80 text-center">
                <p className="text-xs text-slate-400">
                  New company?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthMode('register_company');
                    }}
                    className="text-blue-400 hover:underline font-semibold cursor-pointer ml-1"
                  >
                    Register New Workspace
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* VIEW 2: DEDICATED PASSWORD RESET SCREEN */}
          {authMode === 'reset_password' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Set New Account Password
                </h2>
                <p className="text-xs text-slate-400">
                  Account: <span className="text-blue-400 font-mono">{resetEmail || email}</span>
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-500/25 cursor-pointer"
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
                className="w-full text-center text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </div>
          )}

          {/* VIEW 3: FORGOT PASSWORD REQUEST SCREEN */}
          {authMode === 'forgot_password' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Reset Account Password
                </h2>
                <p className="text-xs text-slate-400">
                  Enter your registered work email to verify and reset your workspace password.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="owner@aquaflow.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-500/25 cursor-pointer"
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
                className="w-full text-center text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </div>
          )}

          {/* VIEW 4: ACCEPT INVITATION SCREEN */}
          {authMode === 'accept_invite' && (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2">
                  <Mail className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Join Workspace Team
                </h2>
                <p className="text-xs text-slate-400">
                  You have been invited to collaborate in a water manufacturing workspace. Set your password to enter.
                </p>
              </div>

              {inviteDetails && (
                <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 space-y-1.5 text-xs">
                  <div className="text-slate-400 flex items-center justify-between">
                    <span>Target Workspace:</span>
                    <strong className="text-white font-semibold">{inviteDetails.organizationName}</strong>
                  </div>
                  {inviteDetails.role && (
                    <div className="text-slate-400 flex items-center justify-between">
                      <span>Assigned Role:</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-300 font-medium capitalize">
                        {inviteDetails.role.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  {inviteDetails.email && (
                    <div className="text-slate-400 flex items-center justify-between">
                      <span>Invited Email:</span>
                      <span className="text-slate-300 font-mono text-[11px]">{inviteDetails.email}</span>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleAcceptInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Marcus Vance"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Create Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-500/25 cursor-pointer"
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
                className="w-full text-center text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
            </div>
          )}

          {/* VIEW 5: MULTI-STEP COMPANY REGISTRATION */}
          {authMode === 'register_company' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Register Company Workspace
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Create a dedicated manufacturing tenant with plant, warehouse, and accounting modules.
                </p>
              </div>

              {/* Stepper Header */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#0d1424] border border-slate-800">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${onboardingStep >= 1 ? 'text-blue-400' : 'text-slate-500'}`}>
                  <span className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-[10px]">1</span>
                  Company
                </div>
                <div className="w-8 h-px bg-slate-800" />
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${onboardingStep >= 2 ? 'text-blue-400' : 'text-slate-500'}`}>
                  <span className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-[10px]">2</span>
                  Plan
                </div>
                <div className="w-8 h-px bg-slate-800" />
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${onboardingStep >= 3 ? 'text-blue-400' : 'text-slate-500'}`}>
                  <span className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-[10px]">3</span>
                  Owner
                </div>
              </div>

              <form onSubmit={handleRegisterCompany} className="space-y-4">
                {onboardingStep === 1 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="AquaFlow Demo Water Company"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1424] border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Currency
                        </label>
                        <input
                          type="text"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1424] border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!companyName.trim()}
                      onClick={() => setOnboardingStep(2)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
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
                              ? 'bg-blue-600/15 border-blue-500 text-white'
                              : 'bg-[#0d1424] border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold">{plan.name}</div>
                            <div className="text-[11px] text-slate-400">{plan.desc}</div>
                          </div>
                          <div className="text-xs font-mono font-bold text-blue-400">{plan.price}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOnboardingStep(1)}
                        className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setOnboardingStep(3)}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Continue to Owner Details <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {onboardingStep === 3 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Owner Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="AquaFlow Owner"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Owner Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="owner@aquaflow.local"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Owner Password *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="At least 6 characters"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1424] border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setOnboardingStep(2)}
                        className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !ownerEmail || !ownerPassword || !ownerName}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
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
                  className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 cursor-pointer mx-auto"
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
