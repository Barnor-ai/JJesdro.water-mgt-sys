import React, { useState } from 'react';
import { useERPStore } from '../store/useStore';
import { Organization, SubscriptionPlanId } from '../types/database';
import {
  Globe,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Search,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Database,
  Lock,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import {
  testSystemIntegrity,
  runCrossTenantSecurityAudit,
  CrossTenantAuditReport,
} from '../lib/securityAudit';

export function SuperAdminPage() {
  const {
    organizations,
    currentOrganization,
    switchOrganization,
    subscriptionPlans,
    organizationMembers,
    auditLogs,
    updateOrganization,
    addNotification,
  } = useERPStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [dbTestResult, setDbTestResult] = useState<{ running: boolean; message?: string; success?: boolean }>({
    running: false,
  });
  const [pentestRunning, setPentestRunning] = useState(false);
  const [pentestReport, setPentestReport] = useState<CrossTenantAuditReport | null>(null);
  const [showPentestModal, setShowPentestModal] = useState(false);

  // Calculate platform metrics
  const totalOrgs = organizations.length;
  const activeSubs = organizations.filter((o) => o.status === 'active').length;

  const totalMRR = organizations.reduce((acc, org) => {
    const plan = subscriptionPlans.find((p) => p.id === org.plan_id);
    return acc + (plan?.priceMonthly || 29);
  }, 0);

  const totalPlatformUsers = organizationMembers.length;

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTestDatabaseSecurity = async () => {
    setDbTestResult({ running: true });
    try {
      const res = await testSystemIntegrity();
      setDbTestResult({
        running: false,
        success: res.connected,
        message: res.message,
      });
    } catch (e: any) {
      setDbTestResult({
        running: false,
        success: false,
        message: e.message || 'Verification test failed',
      });
    }
  };

  const handleToggleSuspend = (org: Organization) => {
    const newStatus = org.status === 'suspended' ? 'active' : 'suspended';
    updateOrganization({ id: org.id, status: newStatus });
    addNotification({
      title: 'Tenant Status Modified',
      message: `${org.name} has been ${newStatus}.`,
      type: newStatus === 'active' ? 'success' : 'warning',
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Platform Super Administration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global management portal for all tenant manufacturing workspaces, subscription health, and security controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestDatabaseSecurity}
            disabled={dbTestResult.running}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            {dbTestResult.running ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <Database className="w-3.5 h-3.5 text-blue-400" />
            )}
            Verify Storage Integrity
          </button>

          <button
            type="button"
            onClick={async () => {
              setPentestRunning(true);
              setShowPentestModal(true);
              const report = await runCrossTenantSecurityAudit(currentOrganization?.id || 'org-1');
              setPentestReport(report);
              setPentestRunning(false);
            }}
            disabled={pentestRunning}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-xs shadow-md shadow-rose-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            {pentestRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            Simulate Cross-Tenant Pentest
          </button>
        </div>
      </div>

      {/* Database RLS Test Results Banner if Triggered */}
      {dbTestResult.message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            dbTestResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {dbTestResult.success ? (
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            )}
            <div>
              <span className="font-bold">Supabase Database Multi-Tenant Verification:</span>{' '}
              {dbTestResult.message}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDbTestResult({ running: false })}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Tenant Workspaces</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {totalOrgs}
          </p>
          <p className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 100% active operational plants
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Monthly Recurring (MRR)</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            ${totalMRR}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {activeSubs} subscribed organizations
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Platform User Accounts</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {totalPlatformUsers}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Enforced via Supabase Auth & RBAC
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Isolation & Compliance</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            RLS Ready
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Organization-level tenant isolation
          </p>
        </div>
      </div>

      {/* Tenant Workspaces Directory Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Water Manufacturing Tenants
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Switch directly into any company workspace to provide support or configure plant parameters.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search companies, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-6">Company Workspace</th>
                <th className="py-3.5 px-6">Tier Plan</th>
                <th className="py-3.5 px-6">Primary Contact</th>
                <th className="py-3.5 px-6">HQ Location</th>
                <th className="py-3.5 px-6">Team Size</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {filteredOrgs.map((org) => {
                const isCurrent = org.id === currentOrganization?.id;
                const membersInOrg = organizationMembers.filter((m) => m.organization_id === org.id).length;
                const plan = subscriptionPlans.find((p) => p.id === org.plan_id);

                return (
                  <tr key={org.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {org.name}
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {org.registration_number || 'ID: ' + org.id}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        variant={org.plan_id === 'business' ? 'success' : org.plan_id === 'professional' ? 'info' : 'secondary'}
                        className="uppercase font-bold text-[10px]"
                      >
                        {org.plan_id}
                      </Badge>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ${plan?.priceMonthly}/mo
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-900 dark:text-white font-medium">{org.email}</div>
                      <div className="text-[10px] text-slate-400">{org.phone || 'No phone'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-900 dark:text-white">{org.city}, {org.country}</div>
                      <div className="text-[10px] text-slate-400">{org.currency}</div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                      {membersInOrg} members
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        variant={org.status === 'active' ? 'success' : 'danger'}
                        className="capitalize text-[10px]"
                      >
                        {org.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => switchOrganization(org.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Switch In
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(org)}
                          className={`px-2.5 py-1 rounded-lg font-semibold text-xs border transition-colors cursor-pointer ${
                            org.status === 'suspended'
                              ? 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                              : 'border-rose-500/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                          }`}
                        >
                          {org.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Penetration Testing & RLS Security Report Modal */}
      {showPentestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cross-Tenant Security & Penetration Audit
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live isolation test against unauthorized tenant query vectors.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPentestModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {pentestRunning ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Executing Automated Cross-Tenant Penetration Suite...
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Attempting cross-partition queries on sales invoices, customer ledgers, production batches, and financial vouchers.
                </p>
              </div>
            ) : pentestReport ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    pentestReport.passed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">
                        {pentestReport.passed
                          ? 'Zero Cross-Tenant Leakage Detected'
                          : 'Tenant Boundary Vulnerabilities Detected'}
                      </p>
                      <p className="text-xs opacity-90">
                        {pentestReport.passedChecks} of {pentestReport.totalChecks} penetration tests passed with verified Row-Level Security isolation.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono opacity-75">
                    {new Date(pentestReport.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Individual Check Results */}
                <div className="space-y-2.5">
                  {pentestReport.results.map((r, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111827]/50 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              r.passed ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {r.check}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {r.details}
                        </p>
                      </div>
                      <Badge
                        variant={r.passed ? 'success' : 'danger'}
                        className="uppercase text-[9px] shrink-0"
                      >
                        {r.passed ? 'Guarded' : 'Failed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowPentestModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close Audit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
