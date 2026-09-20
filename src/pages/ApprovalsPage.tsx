import React, { useState } from 'react';
import { useERPStore } from '../store/useStore';
import { ApprovalWorkflow } from '../types/database';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Plus,
  AlertCircle,
  FileText,
  DollarSign,
  PackageX,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDateTime } from '../lib/utils';

export function ApprovalsPage() {
  const {
    approvalWorkflows,
    requestApproval,
    reviewApproval,
    currentUser,
    activeRole,
  } = useERPStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalWorkflow | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  // New Request Form State
  const [reqType, setReqType] = useState<ApprovalWorkflow['type']>('Expense Approval');
  const [reqTitle, setReqTitle] = useState('');
  const [reqAmount, setReqAmount] = useState<number>(650);
  const [reqNotes, setReqNotes] = useState('');

  const canReview = ['owner', 'super_admin', 'admin', 'factory_manager', 'accountant'].includes(activeRole);

  const filtered = approvalWorkflows.filter((a) => {
    if (activeTab === 'pending' && a.status !== 'Pending') return false;
    if (activeTab === 'completed' && a.status === 'Pending') return false;
    if (filterType !== 'all' && a.type !== filterType) return false;
    return true;
  });

  const pendingCount = approvalWorkflows.filter((a) => a.status === 'Pending').length;

  const handleOpenReview = (appr: ApprovalWorkflow, decision: 'Approved' | 'Rejected') => {
    setSelectedApproval(appr);
    setReviewDecision(decision);
    setReviewNotes('');
    setIsReviewOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!selectedApproval) return;
    await reviewApproval(selectedApproval.id, reviewDecision, reviewNotes || `Decision confirmed by ${currentUser.full_name}`);
    setIsReviewOpen(false);
    setSelectedApproval(null);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestApproval(reqType, `rec-${Date.now()}`, reqTitle, reqAmount, reqNotes);
    setIsRequestOpen(false);
    setReqTitle('');
    setReqNotes('');
  };

  const getTypeIcon = (type: ApprovalWorkflow['type']) => {
    switch (type) {
      case 'Expense Approval':
        return <DollarSign className="w-4 h-4 text-purple-500" />;
      case 'Purchase Approval':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'Stock Adjustment':
        return <PackageX className="w-4 h-4 text-rose-500" />;
      case 'Credit Sale':
      case 'Sales Return':
        return <Tag className="w-4 h-4 text-amber-500" />;
      default:
        return <CheckSquare className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Operations Approval Workflows
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Two-person verification rule for high-value expenses, major purchase orders, and stock adjustments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRequestOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Request New Approval
        </button>
      </div>

      {/* Tabs & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Segmented Tab Bar */}
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Action
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed Archive
          </button>
        </div>

        {/* Filter by Type */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">Filter Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer text-xs"
          >
            <option value="all">All Workflow Types</option>
            <option value="Expense Approval">Expense Approval (&gt; $500)</option>
            <option value="Purchase Approval">Purchase Order Approval</option>
            <option value="Stock Adjustment">Stock Write-off / Adjustment</option>
            <option value="Credit Sale">Credit Sale Terms</option>
            <option value="Sales Return">Sales Return / Refund</option>
          </select>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              No approvals {activeTab === 'pending' ? 'pending' : 'found'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              All financial thresholds and operational change requests are up to date.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-6">Workflow Type</th>
                  <th className="py-3.5 px-6">Item / Reference</th>
                  <th className="py-3.5 px-6">Value</th>
                  <th className="py-3.5 px-6">Requested By</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Reviewer Remarks</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {filtered.map((appr) => (
                  <tr key={appr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(appr.type)}
                        <span>{appr.type}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                      {appr.reference_title}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                      {appr.amount ? formatCurrency(appr.amount) : '—'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-900 dark:text-white font-medium">{appr.requested_by}</div>
                      <div className="text-[10px] text-slate-400">{formatDateTime(appr.requested_at)}</div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        variant={
                          appr.status === 'Approved'
                            ? 'success'
                            : appr.status === 'Rejected'
                            ? 'danger'
                            : 'warning'
                        }
                        className="font-semibold text-[10px]"
                      >
                        {appr.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-slate-500 max-w-xs truncate">
                      {appr.reviewed_by ? (
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{appr.reviewed_by}</span>:{' '}
                          {appr.notes || 'Approved according to budget limits'}
                        </div>
                      ) : (
                        appr.notes || 'Awaiting supervisor authorization'
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {appr.status === 'Pending' ? (
                        canReview ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenReview(appr, 'Approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReview(appr, 'Rejected')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Reviewer permission required</span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Decided {appr.reviewed_at ? new Date(appr.reviewed_at).toLocaleDateString() : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {isReviewOpen && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              Confirm {reviewDecision} Decision
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You are recording an official governance action on{' '}
              <strong className="text-slate-800 dark:text-slate-200">{selectedApproval.reference_title}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Audit Remarks / Reasons (Optional)
              </label>
              <textarea
                rows={3}
                placeholder={reviewDecision === 'Approved' ? 'Verified against monthly plant operational budget.' : 'Exceeds authorized single-ticket procurement ceiling.'}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                  reviewDecision === 'Approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                Confirm {reviewDecision}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Approval Modal */}
      {isRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-500" />
              Submit Item for Authorization
            </h3>

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workflow Category
                </label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value as ApprovalWorkflow['type'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="Expense Approval">Operational Expense &gt; $500</option>
                  <option value="Purchase Approval">Capital Purchase Order</option>
                  <option value="Stock Adjustment">Damaged / Expired Stock Write-off</option>
                  <option value="Credit Sale">Credit Sale Request</option>
                  <option value="Sales Return">Sales Return / Refund Authorization</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reference Title / Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reverse Osmosis High-Pressure Pump Repair"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Financial Impact ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reqAmount}
                  onChange={(e) => setReqAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Justification & Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this requires approval and impact on plant downtime..."
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
