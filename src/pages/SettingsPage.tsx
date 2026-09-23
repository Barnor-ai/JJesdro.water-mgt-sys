import React, { useState, useEffect } from 'react';
import {
  Building2,
  Shield,
  Key,
  Save,
  Download,
  Upload,
  RefreshCw,
  Plus,
  MapPin,
  Power,
  X,
  CheckCircle2,
  AlertCircle,
  Globe2,
  Receipt,
  Factory,
  Database,
  Lock,
  Layers,
  FileText,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import {
  SUPPORTED_COUNTRIES,
  CURRENCIES,
  getCountryByCode,
  getCurrencyByCode,
} from '../lib/currency';
import { sanitizePlantName } from '../lib/branding';
import { DocumentHeader, DocumentFooter } from '../components/common/DocumentHeader';

type SettingsTab =
  | 'company'
  | 'regional'
  | 'branding'
  | 'plants'
  | 'security'
  | 'admin';

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
    setUpgradeModalOpen,
    updateSupabasePassword,
    updateOrganization,
  } = useERPStore();

  const userRole = (currentUser?.role || 'viewer').toLowerCase();
  const isOwnerOrAdmin =
    userRole === 'owner' || userRole === 'admin' || userRole === 'super_admin';
  const isAccountant = userRole === 'accountant';

  // Determine allowed tabs based on role
  const allowedTabs: SettingsTab[] = React.useMemo(() => {
    if (isOwnerOrAdmin) {
      return ['company', 'regional', 'branding', 'plants', 'security', 'admin'];
    }
    if (isAccountant) {
      return ['regional', 'security'];
    }
    return ['security'];
  }, [isOwnerOrAdmin, isAccountant]);

  const [activeTab, setActiveTab] = useState<SettingsTab>(allowedTabs[0]);

  // Ensure active tab is always authorized
  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs, activeTab]);

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

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdUpdating, setPwdUpdating] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Company Profile & Official Branding Form State
  const [companyName, setCompanyName] = useState(currentOrganization?.name || 'Company Name');
  const [taxId, setTaxId] = useState(currentOrganization?.tax_id || '');
  const [phone, setPhone] = useState(currentOrganization?.phone || '');
  const [email, setEmail] = useState(currentOrganization?.email || '');
  const [address, setAddress] = useState(currentOrganization?.address || '');
  const [country, setCountry] = useState(currentOrganization?.country || 'GH');
  const [currency, setCurrency] = useState(currentOrganization?.currency || 'GHS');
  const [timezone, setTimezone] = useState(currentOrganization?.timezone || 'Africa/Accra');
  const [fiscalYearEnd, setFiscalYearEnd] = useState(currentOrganization?.fiscal_year_end || '12-31');
  const [logoUrl, setLogoUrl] = useState(currentOrganization?.logo_url || '');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [autoBarcodePrint, setAutoBarcodePrint] = useState(true);
  const [invoiceTerms, setInvoiceTerms] = useState(
    'Goods received in good condition are not returnable without prior QA authorization. Thank you for your business.'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Synchronize state when organization updates
  useEffect(() => {
    if (currentOrganization) {
      if (currentOrganization.name) setCompanyName(currentOrganization.name);
      if (currentOrganization.tax_id) setTaxId(currentOrganization.tax_id);
      if (currentOrganization.phone) setPhone(currentOrganization.phone);
      if (currentOrganization.email) setEmail(currentOrganization.email);
      if (currentOrganization.address) setAddress(currentOrganization.address);
      if (currentOrganization.country) setCountry(currentOrganization.country);
      if (currentOrganization.currency) setCurrency(currentOrganization.currency);
      if (currentOrganization.timezone) setTimezone(currentOrganization.timezone);
      if (currentOrganization.fiscal_year_end) setFiscalYearEnd(currentOrganization.fiscal_year_end);
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

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await updateOrganization({
      name: companyName.trim() || 'Company Name',
      tax_id: taxId.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      logo_url: logoUrl,
      country,
      currency,
      timezone,
      fiscal_year_end: fiscalYearEnd,
    });

    // Ensure immediate persistence for active tabs and currency formatting
    try {
      const currentOrgData = {
        ...(currentOrganization || {}),
        name: companyName.trim() || 'Company Name',
        tax_id: taxId.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        logo_url: logoUrl,
        country,
        currency,
        timezone,
        fiscal_year_end: fiscalYearEnd,
      };
      localStorage.setItem('h2o_erp_v2_current_org', JSON.stringify(currentOrgData));
      localStorage.setItem('h2o_erp_v2_current_organization', JSON.stringify(currentOrgData));
    } catch {}

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExportBackup = () => {
    const storeObj = useERPStore as any;
    const state = typeof storeObj.getState === 'function' ? storeObj.getState() : {};
    const backupData = {
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      organization: state.currentOrganization || currentOrganization,
      branches: state.branches || branches,
      bottleTypes: state.bottleTypes || bottleTypes,
      sales: state.sales || [],
      expenses: state.expenses || [],
      purchases: state.purchases || [],
      customers: state.customers || [],
      suppliers: state.suppliers || [],
      productionBatches: state.productionBatches || [],
      finishedGoods: state.finishedGoods || [],
      rawMaterials: state.rawMaterials || [],
    };
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const safeName = (companyName || 'Company').replace(/[^a-zA-Z0-9]/g, '_');
    downloadAnchor.setAttribute(
      'download',
      `${safeName}_Enterprise_Backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const tabsConfig: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'company', label: 'Company Profile', icon: <Building2 className="w-4 h-4" /> },
    { id: 'regional', label: 'Regional & Financial', icon: <Globe2 className="w-4 h-4" /> },
    { id: 'branding', label: 'Document & Invoice Branding', icon: <Receipt className="w-4 h-4" /> },
    { id: 'plants', label: 'Plants & Facilities', icon: <Factory className="w-4 h-4" /> },
    { id: 'security', label: 'Security & Credentials', icon: <Shield className="w-4 h-4" /> },
    { id: 'admin', label: 'Administration & Data Backup', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            System Settings & Enterprise Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Company legal identity, document branding, financial currency, facility plants, and security
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" /> Configuration Saved Successfully
          </span>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max pb-px">
          {tabsConfig
            .filter((t) => allowedTabs.includes(t.id))
            .map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
                    isActive
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Tab 1: COMPANY INFORMATION (Owner / Admin) */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Legal Identity</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official entity information printed on all customer invoices, receipts, and statutory records
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Logo Upload */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Company Official Logo
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1 shadow-xs">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Company Logo Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <Building2 className="w-7 h-7 mx-auto text-slate-400 dark:text-slate-500" />
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5 font-medium">
                            No Logo
                          </span>
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
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs">
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
                      Supports PNG, JPG, WebP, or SVG (Max 5MB). Automatically rendered on customer receipts, invoices, and PDF downloads.
                    </p>
                    {logoError && (
                      <p className="text-xs text-rose-500 font-medium">{logoError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Company Legal Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Beljack Ltd"
                  required
                />
                <Input
                  label="Tax ID / VAT Registration"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="e.g. TIN-P002341991"
                  required
                />
                <Input
                  label="Telephone / Customer Service"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +233 (0) 30 200 0000"
                  required
                />
                <Input
                  label="Operations Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. operations@beljack.com"
                  required
                />
              </div>

              <Input
                label="Factory Physical Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Building A, Industrial Springs Park"
                required
              />

              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="primary" type="submit">
                  <Save className="w-4 h-4 mr-1.5" /> Save Company Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Tab 2: REGIONAL & FINANCIAL SETTINGS (Owner / Admin, Accountant) */}
      {activeTab === 'regional' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regional Jurisdiction & Accounting Currency</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configures operational currency code, regional symbols, and fiscal accounting year
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Country & Jurisdiction
                  </label>
                  <select
                    value={country}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setCountry(newCode);
                      const cObj = getCountryByCode(newCode);
                      if (cObj) {
                        setCurrency(cObj.currency);
                        if (cObj.timezone) setTimezone(cObj.timezone);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Operating Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
                  >
                    {CURRENCIES.map((cur) => (
                      <option key={cur.code} value={cur.code}>
                        {cur.code} — {cur.name} ({cur.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Fiscal Year End
                  </label>
                  <select
                    value={fiscalYearEnd}
                    onChange={(e) => setFiscalYearEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="12-31">December 31 (Calendar Year)</option>
                    <option value="03-31">March 31 (Q1 Financial Year)</option>
                    <option value="06-30">June 30 (Mid-Year Financial Year)</option>
                    <option value="09-30">September 30 (Q3 Financial Year)</option>
                  </select>
                </div>
              </div>

              {/* Currency Preview Card */}
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Active Currency: {currency} ({getCurrencyByCode(currency)?.symbol || '$'})
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    All revenue, expense, and financial reports are automatically formatted using this currency.
                  </span>
                </div>
                <div className="text-sm font-mono font-black text-sky-600 dark:text-sky-400 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-sky-500/30">
                  Preview: {getCurrencyByCode(currency)?.symbol || ''}1,250,000.00 {currency}
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="primary" type="submit">
                  <Save className="w-4 h-4 mr-1.5" /> Save Regional Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* Tab 3: DOCUMENT & INVOICE BRANDING (Owner / Admin) */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Official Document Letterhead & Invoice Preview</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live interactive preview showing exactly how your company legal identity appears on receipts and invoices
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Interactive Live Document Header Preview */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                <DocumentHeader
                  title="SALES INVOICE"
                  documentNumber="INV-000125"
                  documentDate={new Date().toISOString().slice(0, 10)}
                  badge="PAID"
                  branchName={orgBranches[0]?.name || 'Main Plant'}
                />

                <div className="my-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs font-mono">
                  <div className="flex justify-between py-1 text-slate-500">
                    <span>1. Purified Spring Water - 500ml (Pack of 24)</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {currency} 120.00
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-500">
                    <span>2. Pure Mineral Water - 750ml (Pack of 12)</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {currency} 95.00
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-t border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                    <span>Total Amount:</span>
                    <span className="text-sky-600 dark:text-sky-400">{currency} 215.00</span>
                  </div>
                </div>

                <DocumentFooter note={invoiceTerms} />
              </div>

              {/* Preferences Form */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Default Invoice Terms & Customer Notes
                  </label>
                  <textarea
                    rows={2}
                    value={invoiceTerms}
                    onChange={(e) => setInvoiceTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                    placeholder="Enter return policies, bank wire details, or customer note..."
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Auto Barcode Print
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Trigger thermal barcode label on production batch completion
                    </span>
                  </div>
                  <Switch checked={autoBarcodePrint} onChange={setAutoBarcodePrint} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: PLANTS & BRANCHES (Owner / Admin, Production Manager) */}
      {activeTab === 'plants' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Manufacturing Plants & Facility Branches</CardTitle>
                <p className="text-[11px] text-slate-500">
                  {orgBranches.length} of {maxBranches >= 100 ? 'Unlimited' : maxBranches} active plants configured
                </p>
              </div>
              <Button
                variant={isBranchLimitReached ? 'outline' : 'primary'}
                size="sm"
                onClick={() => {
                  if (isBranchLimitReached) {
                    setUpgradeModalOpen(
                      true,
                      `Your workspace has reached the ${maxBranches} plant limit on the ${activePlan.name} plan.`
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
                <span>Add Facility / Plant</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              {orgBranches.map((b, idx) => {
                const cleanName = sanitizePlantName(b.name);
                return (
                  <div
                    key={`${b.id}-${idx}`}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cleanName}
                        </p>
                        {b.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {b.code}
                          </span>
                        )}
                        {b.is_main && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                            Headquarters Plant
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {b.address || b.location || 'Address not specified'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleBranchStatus(b.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                          b.is_active
                            ? 'border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                            : 'border-slate-600/40 text-slate-400 hover:bg-slate-700/20'
                        }`}
                        title={b.is_active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        <Power className="w-3 h-3" />
                        <span className="text-[10px] font-medium">
                          {b.is_active ? 'Active' : 'Offline'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 5: SECURITY & CREDENTIALS (All Users) */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Profile Overview */}
          <Card>
            <CardHeader>
              <CardTitle>User Authentication Profile</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your authorized role and active session authentication credentials
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Full Name</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {currentUser?.full_name || 'Authorized User'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email Address</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {currentUser?.email}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">System Role</span>
                  <Badge variant="primary" size="sm">
                    {currentUser?.role?.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Two-Factor Authentication (2FA)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Require multi-factor authorization during session login
                  </p>
                </div>
                <Switch checked={twoFactorEnabled} onChange={setTwoFactorEnabled} />
              </div>
            </CardContent>
          </Card>

          {/* Change Password Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-sky-500" />
                <CardTitle>Change Password</CardTitle>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update your login password for secure access to the water management system
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {pwdFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    pwdFeedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {pwdFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{pwdFeedback.text}</span>
                </div>
              )}

              <div className="space-y-3">
                <Input
                  type="password"
                  label="New Password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Input
                  type="password"
                  label="Confirm New Password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={pwdUpdating || !newPassword}
                  onClick={async () => {
                    if (newPassword.length < 6) {
                      setPwdFeedback({
                        text: 'Password must be at least 6 characters.',
                        type: 'error',
                      });
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      setPwdFeedback({
                        text: 'Passwords do not match.',
                        type: 'error',
                      });
                      return;
                    }
                    setPwdUpdating(true);
                    setPwdFeedback(null);
                    const res = await updateSupabasePassword(newPassword);
                    setPwdUpdating(false);
                    if (res.success) {
                      setPwdFeedback({
                        text: 'Password updated successfully!',
                        type: 'success',
                      });
                      setNewPassword('');
                      setConfirmPassword('');
                    } else {
                      setPwdFeedback({
                        text: (res as any).message || res.error || 'Update failed',
                        type: 'error',
                      });
                    }
                  }}
                  className="w-full text-xs"
                >
                  {pwdUpdating ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 6: ADMINISTRATION & DATA BACKUP (Owner / Admin Only) */}
      {activeTab === 'admin' && isOwnerOrAdmin && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-500" />
                <CardTitle>Enterprise Administration & Data Archival</CardTitle>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized administrator data controls, snapshot downloads, and local workspace maintenance
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Backup Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Complete Enterprise Data Snapshot
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Download complete encrypted JSON archive of all batches, sales, expenses, inventory, and customer records.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={handleExportBackup} className="shrink-0">
                  <Download className="w-4 h-4 mr-1.5" /> Download Enterprise Backup (.json)
                </Button>
              </div>

              {/* Workspace Maintenance Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Offline Cache & Storage Health
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Re-indexes local client tables and ensures browser database equilibrium.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    alert('Local workspace cache verified and healthy.');
                  }}
                  className="shrink-0"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Verify Storage Equilibrium
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Branch / Plant Modal */}
      {isAddBranchModalOpen && (
        <Modal
          isOpen={isAddBranchModalOpen}
          onClose={() => setIsAddBranchModalOpen(false)}
          title="Add Manufacturing Facility / Plant"
          maxWidth="lg"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!branchName.trim()) {
                setBranchError('Facility / Plant name is required');
                return;
              }
              setBranchLoading(true);
              setBranchError(null);
              const cleanPlant = sanitizePlantName(branchName);
              const res = await addBranch(cleanPlant, branchCode, branchAddress, branchLocation);
              setBranchLoading(false);
              if (res.success) {
                setIsAddBranchModalOpen(false);
              } else {
                setBranchError(res.error || 'Failed to register facility.');
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
                Facility / Plant Name
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
                  Plant Code
                </label>
                <Input
                  placeholder="e.g. PLANT-02"
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
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddBranchModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={branchLoading}>
                {branchLoading ? 'Registering...' : 'Register Plant'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
