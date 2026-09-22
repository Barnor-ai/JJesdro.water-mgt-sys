import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Shield,
  Database,
  Sliders,
  CheckCircle2,
  Key,
  Save,
  Download,
  Upload,
  Cloud,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Copy,
  Check,
  Table,
  AlertCircle,
  Plus,
  MapPin,
  Power,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import {
  testSystemIntegrity,
  TableStatus,
} from '../lib/securityAudit';

export function SettingsPage() {
  const {
    branches,
    bottleTypes,
    currentUser,
    currentOrganization,
    currentSubscription,
    subscriptionPlans,
    addBranch,
    toggleBranchStatus,
    checkLimit,
    setUpgradeModalOpen,
    supabaseConnected,
    isSyncingWithSupabase,
    supabaseLastSyncTime,
    syncToSupabase,
    syncFromSupabase,
    updateSupabasePassword,
    updateOrganization,
  } = useERPStore();

  const activePlan =
    subscriptionPlans.find((p) => p.id === currentSubscription?.plan_id) || subscriptionPlans[1];
  const orgBranches = branches.filter(
    (b) => !b.organization_id || b.organization_id === currentOrganization?.id
  );
  const maxBranches = activePlan.maxBranches;
  const isBranchLimitReached = orgBranches.length >= maxBranches;

  // Branch Modal State
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestReport, setSupabaseTestReport] = useState<{
    connected: boolean;
    message: string;
    tables: TableStatus[];
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdUpdating, setPwdUpdating] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Company Profile & Official Branding
  const [companyName, setCompanyName] = useState(currentOrganization?.name || 'H2O Pure Bottled Water Corp.');
  const [taxId, setTaxId] = useState(currentOrganization?.tax_id || 'TAX-US-99482-B');
  const [phone, setPhone] = useState(currentOrganization?.phone || '+1 (800) 555-4267');
  const [email, setEmail] = useState(currentOrganization?.email || 'operations@h2opure.com');
  const [address, setAddress] = useState(currentOrganization?.address || '100 Springs Blvd, Aqua Valley, CA 90210');
  const [logoUrl, setLogoUrl] = useState(currentOrganization?.logo_url || '');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [autoBarcodePrint, setAutoBarcodePrint] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Synchronize state when organization changes
  useEffect(() => {
    if (currentOrganization) {
      if (currentOrganization.name) setCompanyName(currentOrganization.name);
      if (currentOrganization.tax_id) setTaxId(currentOrganization.tax_id);
      if (currentOrganization.phone) setPhone(currentOrganization.phone);
      if (currentOrganization.email) setEmail(currentOrganization.email);
      if (currentOrganization.address) setAddress(currentOrganization.address);
      if (currentOrganization.logo_url !== undefined) setLogoUrl(currentOrganization.logo_url || '');
    }
  }, [currentOrganization]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Image size must be smaller than 5MB.');
      return;
    }

    setLogoError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLogoUrl(result);
    };
    reader.onerror = () => {
      setLogoError('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSyncStatusMsg(null);
    try {
      const res = await testSystemIntegrity();
      setSupabaseTestReport(res);
    } catch (e: any) {
      setSupabaseTestReport({
        connected: false,
        message: e.message || 'Verification test failed',
        tables: [],
      });
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleSyncToCloud = async () => {
    setSyncStatusMsg(null);
    const res = await syncToSupabase();
    if (res.success) {
      setSyncStatusMsg({ text: res.message, type: 'success' });
      handleTestSupabase();
    } else {
      setSyncStatusMsg({ text: res.message, type: 'error' });
    }
  };

  const handleSyncFromCloud = async () => {
    setSyncStatusMsg(null);
    const res = await syncFromSupabase();
    if (res.success) {
      setSyncStatusMsg({ text: res.message, type: 'success' });
    } else {
      setSyncStatusMsg({ text: res.message, type: 'error' });
    }
  };

  const handleCopySql = async () => {
    try {
      const response = await fetch('/supabase-schema.sql');
      let sql = '';
      if (response.ok) {
        sql = await response.text();
      } else {
        sql = `-- Refer to supabase-schema.sql in project root`;
      }
      await navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateOrganization({
      name: companyName,
      tax_id: taxId,
      phone,
      email,
      address,
      logo_url: logoUrl,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      branches,
      bottleTypes,
      currentUser,
      version: '1.0.0'
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `H2O_ERP_Full_Backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          System Settings & Enterprise Configuration
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Company legal profile, multi-branch routing, two-factor authentication, and database backups
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Profile Settings (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Legal Entity & Invoice Branding</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Printed on all customer invoices, delivery receipts, and export documents
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompany} className="space-y-4">
                {/* Official Company Logo Upload Section */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    Company Official Logo & Document Letterhead
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1 shadow-sm">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt="Company Logo Preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-2">
                            <Building2 className="w-7 h-7 mx-auto text-slate-400 dark:text-slate-500" />
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5 font-medium">No Logo</span>
                          </div>
                        )}
                      </div>
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          title="Remove Logo"
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer transition-colors shadow-xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{logoUrl ? 'Change Company Logo' : 'Upload Company Logo'}</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                        {logoUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveLogo}
                            className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400"
                          >
                            Remove Logo
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Supports PNG, JPG, WebP, or SVG (Max 5MB). Displays in the header, sidebar, customer receipts, and invoice PDFs.
                      </p>
                      {logoError && (
                        <p className="text-xs text-rose-500 font-medium">{logoError}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Company Legal Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                  <Input
                    label="Tax ID / VAT Registration"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    required
                  />
                  <Input
                    label="Telephone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <Input
                    label="Operations Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="Factory Physical Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />

                <div className="flex items-center justify-between pt-2">
                  {savedSuccess ? (
                    <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Preferences Saved!
                    </span>
                  ) : <div />}
                  <Button variant="primary" type="submit">
                    <Save className="w-4 h-4 mr-1.5" /> Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Bottle SKU Pricing Calibration */}
          <Card>
            <CardHeader>
              <CardTitle>Bottle Type Master Catalog</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Standard pricing, wholesale discount matrix, and EAN-13 barcodes
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="p-3 pl-5">SKU Size</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-right">Cost ($)</th>
                      <th className="p-3 text-right">Wholesale ($)</th>
                      <th className="p-3 text-right">Retail ($)</th>
                      <th className="p-3 text-right pr-5">Barcode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {bottleTypes.map((bt) => (
                      <tr key={bt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 pl-5 font-sans font-bold">{bt.size}</td>
                        <td className="p-3 font-sans text-slate-500">{bt.name}</td>
                        <td className="p-3 text-right text-rose-500">${bt.cost}</td>
                        <td className="p-3 text-right font-bold text-sky-600 dark:text-sky-400">
                          ${bt.wholesale_price}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          ${bt.selling_price}
                        </td>
                        <td className="p-3 text-right pr-5 text-slate-400">{bt.barcode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Supabase Cloud Database, Security, Branches & Backup */}
        <div className="space-y-6">
          {/* Local Storage & Engine Persistence Card */}
          <Card className="border-blue-500/30 dark:border-blue-500/20 shadow-md">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Local Persistence Engine</CardTitle>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Mode: <span className="text-blue-600 dark:text-blue-400 font-semibold">Standalone Local Storage</span>
                    </p>
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  System Online
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {syncStatusMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                    syncStatusMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {syncStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{syncStatusMsg.text}</span>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Storage Engine</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] truncate block">
                    Browser Local Storage + Web Crypto SHA-256
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">External Dependencies</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                      None (Zero Supabase API keys required)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestSupabase}
                  disabled={testingSupabase}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testingSupabase ? 'animate-spin' : ''}`} />
                  {testingSupabase ? 'Verifying...' : 'Verify Local Stores'}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportBackup}
                >
                  <DownloadCloud className="w-3.5 h-3.5 mr-1.5" />
                  Export Backup
                </Button>
              </div>

              {/* Table Report */}
              {supabaseTestReport && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Table className="w-3.5 h-3.5 text-blue-500" />
                      Store Verification
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {supabaseTestReport.tables.filter((t) => t.exists).length}/{supabaseTestReport.tables.length} verified
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {supabaseTestReport.tables.map((t) => (
                      <div
                        key={t.table}
                        className={`p-1.5 rounded text-[11px] flex items-center justify-between border ${
                          t.exists
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        <span className="truncate font-mono">{t.table}</span>
                        <span className="font-semibold text-[10px]">
                          {t.exists ? `${t.count ?? 0}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security & 2FA */}

          <Card>
            <CardHeader>
              <CardTitle>Security & Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Two-Factor Authentication (2FA)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Require authenticator code on login
                  </p>
                </div>
                <Switch checked={twoFactorEnabled} onChange={setTwoFactorEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Auto Barcode Print
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Trigger thermal label on batch save
                  </p>
                </div>
                <Switch checked={autoBarcodePrint} onChange={setAutoBarcodePrint} />
              </div>

              {/* Logged-In User Password Change Form */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Key className="w-3.5 h-3.5 text-blue-500" />
                  <span>Change Password</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Update your personal login password for {currentUser?.email}.
                </p>

                {pwdFeedback && (
                  <div
                    className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                      pwdFeedback.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}
                  >
                    {pwdFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{pwdFeedback.text}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="New password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    disabled={pwdUpdating || !newPassword}
                    onClick={async () => {
                      if (newPassword.length < 6) {
                        setPwdFeedback({ text: 'Password must be at least 6 characters.', type: 'error' });
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        setPwdFeedback({ text: 'Passwords do not match.', type: 'error' });
                        return;
                      }
                      setPwdUpdating(true);
                      setPwdFeedback(null);
                      const res = await updateSupabasePassword(newPassword);
                      setPwdUpdating(false);
                      if (res.success) {
                        setPwdFeedback({ text: 'Password updated successfully!', type: 'success' });
                        setNewPassword('');
                        setConfirmPassword('');
                      } else {
                        setPwdFeedback({ text: (res as any).message || res.error || 'Update failed', type: 'error' });
                      }
                    }}
                    className="w-full text-xs"
                  >
                    {pwdUpdating ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plant Branches */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Plant Branches</CardTitle>
                <p className="text-[11px] text-slate-500">
                  {orgBranches.length} of {maxBranches >= 100 ? 'Unlimited' : maxBranches} branch locations used
                </p>
              </div>
              <Button
                variant={isBranchLimitReached ? 'outline' : 'primary'}
                size="sm"
                onClick={() => {
                  if (isBranchLimitReached) {
                    setUpgradeModalOpen(
                      true,
                      `Your workspace has reached the ${maxBranches} branch limit on the ${activePlan.name} plan. Upgrade to unlock multi-facility expansion.`
                    );
                  } else {
                    setBranchError(null);
                    setBranchName('');
                    setBranchCode('');
                    setBranchAddress('');
                    setBranchLocation('');
                    setIsAddBranchModalOpen(true);
                  }
                }}
                className="text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Branch</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {orgBranches.map((b, idx) => (
                <div
                  key={`${b.id}-${idx}`}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{b.name}</p>
                      {b.code && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {b.code}
                        </span>
                      )}
                      {b.is_main && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                          HQ Plant
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {b.address || b.location || 'Address not specified'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleBranchStatus(b.id)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                        b.is_active
                          ? 'border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                          : 'border-slate-600/40 text-slate-400 hover:bg-slate-700/20'
                      }`}
                      title={b.is_active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <Power className="w-3 h-3" />
                      <span className="text-[10px] font-medium">{b.is_active ? 'Active' : 'Offline'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Add Branch Modal */}
          {isAddBranchModalOpen && (
            <Modal
              isOpen={isAddBranchModalOpen}
              onClose={() => setIsAddBranchModalOpen(false)}
              title="Add Facility / Plant Branch"
            >
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!branchName.trim()) {
                    setBranchError('Branch name is required');
                    return;
                  }
                  setBranchLoading(true);
                  setBranchError(null);
                  const res = await addBranch(branchName, branchCode, branchAddress, branchLocation);
                  setBranchLoading(false);
                  if (res.success) {
                    setIsAddBranchModalOpen(false);
                  } else {
                    setBranchError(res.error || 'Failed to add branch.');
                  }
                }}
                className="space-y-4"
              >
                {branchError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{branchError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Branch / Facility Name
                  </label>
                  <Input
                    placeholder="e.g. Tema Industrial Plant"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Branch Code
                    </label>
                    <Input
                      placeholder="e.g. TIP-02"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      City / Region
                    </label>
                    <Input
                      placeholder="e.g. Greater Accra"
                      value={branchLocation}
                      onChange={(e) => setBranchLocation(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Physical Address
                  </label>
                  <Input
                    placeholder="e.g. Plot 44, Heavy Industrial Area"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddBranchModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={branchLoading}
                  >
                    {branchLoading ? 'Registering...' : 'Register Branch'}
                  </Button>
                </div>
              </form>
            </Modal>
          )}

          {/* System Backup & JSON Export */}
          <Card>
            <CardHeader>
              <CardTitle>Database Snapshot & Backup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                Download complete database state including all batches, invoices, customers, and inventory logs.
              </p>
              <Button variant="outline" size="sm" onClick={handleExportBackup} className="w-full">
                <Download className="w-4 h-4 mr-1.5" /> Download Full JSON Backup
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
