import React, { useState } from 'react';
import { useERPStore } from '../store/useStore';
import { SubscriptionPlanId } from '../types/database';
import {
  CreditCard,
  Zap,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Download,
  ShieldCheck,
  Building2,
  Users,
  Warehouse,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Sparkles,
  Receipt,
  FileText,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDateTime } from '../lib/utils';

export function BillingPage() {
  const {
    currentOrganization,
    currentSubscription,
    subscriptionPlans,
    billingRecords,
    organizationMembers,
    branches,
    changeSubscriptionPlan,
    setUpgradeModalOpen,
    activeRole,
  } = useERPStore();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const activePlan =
    subscriptionPlans.find((p) => p.id === currentSubscription?.plan_id) || subscriptionPlans[1];

  const activeUsers = organizationMembers.filter((m) => m.is_active).length;
  const userPercent = Math.min(100, Math.round((activeUsers / (activePlan.maxUsers || 1)) * 100));

  const branchCount = branches.length;
  const branchPercent = Math.min(100, Math.round((branchCount / (activePlan.maxBranches || 1)) * 100));

  const daysLeftInTrial = currentSubscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(currentSubscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleDownloadInvoice = (recId: string, ref: string) => {
    setDownloadingId(recId);
    setTimeout(() => {
      setDownloadingId(null);
      const invoiceData = `AQUAFLOW SAAS INVOICE\n====================\nOrganization: ${currentOrganization?.name || 'AquaFlow Workspace'}\nReference: ${ref}\nDate: ${new Date().toLocaleDateString()}\nStatus: PAID\nAmount: $${activePlan.priceMonthly}.00 USD\nPayment Provider: Paystack Secure Checkout\n\nThank you for choosing AquaFlow ERP!`;
      const blob = new Blob([invoiceData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${ref}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 400);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Workspace Subscription & Billing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your company workspace subscription, capacity allocations, and tax-compliant invoice history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true, 'Select a higher tier to scale your factory capacity.')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Trial Banner if Applicable */}
      {daysLeftInTrial > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                14-Day Free Trial Active: {daysLeftInTrial} days remaining
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Your workspace is currently enjoying full {activePlan.name} features without restriction.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-sm"
          >
            Activate Subscription
          </button>
        </div>
      )}

      {/* Overview Grid: Active Plan + Resource Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plan Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Workspace Plan</span>
              <Badge variant="success" className="uppercase font-bold text-[10px]">
                {currentSubscription?.status || 'active'}
              </Badge>
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3 flex items-baseline gap-2">
              {activePlan.name}
              <span className="text-sm font-normal text-slate-500">
                (${activePlan.priceMonthly}/mo)
              </span>
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Assigned to <strong className="text-slate-700 dark:text-slate-200">{currentOrganization?.name || 'Workspace'}</strong>. Billed to {currentOrganization?.email || 'billing@aquaflow.com'}.
            </p>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-500" /> Renewal Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentSubscription?.current_period_end ? new Date(currentSubscription.current_period_end).toLocaleDateString() : 'Continuous'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-emerald-500" /> Payment Provider</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Paystack Gateway
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 fill-current" /> Switch Tier
            </button>
          </div>
        </div>

        {/* Capacity Limits & Usage Gauges */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Allocated Tier Limits & Live Consumption
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Capacities automatically expand as you upgrade your subscription tier.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {/* User Seats Meter */}
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" /> Team Seats
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {activeUsers} / {activePlan.maxUsers > 1000 ? '∞' : activePlan.maxUsers}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all ${userPercent > 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
                    style={{ width: `${Math.min(100, userPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {activePlan.maxUsers > 1000 ? 'Unlimited users included' : `${activePlan.maxUsers - activeUsers} seats remaining`}
                </p>
              </div>

              {/* Manufacturing Plants Meter */}
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Plants
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {branchCount} / {activePlan.maxBranches > 1000 ? '∞' : activePlan.maxBranches}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${Math.min(100, branchPercent)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Multi-site bottling synchronization
                </p>
              </div>

              {/* Warehouses Meter */}
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Warehouse className="w-3.5 h-3.5 text-amber-500" /> Warehouses
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {branchCount} / {activePlan.maxWarehouses > 1000 ? '∞' : activePlan.maxWarehouses}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${Math.min(100, Math.round((branchCount / (activePlan.maxWarehouses || 1)) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Regional stock replenishment depots
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Tenant database isolation and automatic backups active
            </span>
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Compare Tier Features <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Invoice & Payment History Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              Billing History & Official Receipts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Download tax invoices and receipts for accounting and expense filing.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-6">Invoice #</th>
                <th className="py-3.5 px-6">Billing Period</th>
                <th className="py-3.5 px-6">Description</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {billingRecords.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="py-4 px-6 font-mono font-semibold text-slate-900 dark:text-white">
                    {bill.reference}
                  </td>
                  <td className="py-4 px-6">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-900 dark:text-white">
                    {bill.description}
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                    ${bill.amount}.00 USD
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant="success" className="capitalize font-semibold text-[10px]">
                      {bill.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => handleDownloadInvoice(bill.id, bill.reference)}
                      disabled={downloadingId === bill.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      {downloadingId === bill.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
