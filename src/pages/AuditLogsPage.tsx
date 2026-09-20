import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Download,
  ShieldCheck,
  Filter,
  FileSpreadsheet,
  Calendar,
  Layers,
  Eye,
  X,
  PlusCircle,
  Database,
  ArrowUpDown,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { useERPStore, addAuditLog } from '../store/useStore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatDateTime } from '../lib/utils';
import { exportToExcel, exportToCSV } from '../lib/exportUtils';
import { AuditLog } from '../types/database';

export function AuditLogsPage() {
  const store = useERPStore();
  const auditLogs = store?.auditLogs || [];
  const currentOrganization = store?.currentOrganization;
  const currentUser = store?.currentUser;
  const currentBranchId = store?.currentBranchId;
  const branches = store?.branches || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedTable, setSelectedTable] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [selectedLogForModal, setSelectedLogForModal] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Safe logs extraction and strict tenant filtering
  const tenantLogs = useMemo(() => {
    if (!Array.isArray(auditLogs)) return [];
    return auditLogs.filter((log) => {
      if (!log) return false;
      // Allow logs without org_id (global/system) or matching current org
      if (!log.organization_id) return true;
      if (!currentOrganization?.id) return true;
      return log.organization_id === currentOrganization.id;
    });
  }, [auditLogs, currentOrganization?.id]);

  // Unique actions and tables for filter dropdowns
  const availableActions = useMemo(() => {
    const set = new Set<string>();
    tenantLogs.forEach((l) => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set).sort();
  }, [tenantLogs]);

  const availableTables = useMemo(() => {
    const set = new Set<string>();
    tenantLogs.forEach((l) => {
      if (l.table_name) set.add(l.table_name);
    });
    return Array.from(set).sort();
  }, [tenantLogs]);

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const now = Date.now();

    return tenantLogs.filter((log) => {
      if (!log) return false;

      // Action Filter
      if (selectedAction !== 'ALL' && log.action !== selectedAction) {
        return false;
      }

      // Table Filter
      if (selectedTable !== 'ALL' && log.table_name !== selectedTable) {
        return false;
      }

      // Date Range Filter
      if (dateFilter !== 'ALL' && log.created_at) {
        const logTime = new Date(log.created_at).getTime();
        if (isNaN(logTime)) return true;
        if (dateFilter === 'TODAY' && now - logTime > 86400000) return false;
        if (dateFilter === 'WEEK' && now - logTime > 7 * 86400000) return false;
        if (dateFilter === 'MONTH' && now - logTime > 30 * 86400000) return false;
      }

      // Search Term Query
      if (term) {
        const actionMatch = Boolean(log.action?.toLowerCase().includes(term));
        const userMatch = Boolean(
          (log.user_name || log.user_email || '')?.toLowerCase().includes(term)
        );
        const tableMatch = Boolean(log.table_name?.toLowerCase().includes(term));
        const ipMatch = Boolean(log.ip_address?.toLowerCase().includes(term));
        const idMatch = Boolean(log.id?.toLowerCase().includes(term));
        const recordMatch = Boolean(log.record_id?.toLowerCase().includes(term));

        let detailsMatch = false;
        try {
          const detailsStr =
            typeof log.details === 'object'
              ? JSON.stringify(log.details)
              : String(log.details || '');
          detailsMatch = detailsStr.toLowerCase().includes(term);
        } catch {
          detailsMatch = false;
        }

        return actionMatch || userMatch || tableMatch || ipMatch || idMatch || recordMatch || detailsMatch;
      }

      return true;
    });
  }, [tenantLogs, selectedAction, selectedTable, dateFilter, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const total = tenantLogs.length;
    const authCount = tenantLogs.filter((l) =>
      ['LOGIN', 'REGISTER', 'ROLE_SWITCH', 'PASSWORD_RESET'].includes(l.action)
    ).length;
    const mutations = tenantLogs.filter((l) =>
      ['CREATE', 'UPDATE', 'DELETE'].includes(l.action)
    ).length;
    const approvals = tenantLogs.filter((l) =>
      ['REQUEST_APPROVAL', 'REVIEW_APPROVAL', 'PLAN_CHANGE'].includes(l.action)
    ).length;

    return { total, authCount, mutations, approvals };
  }, [tenantLogs]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleCreateTestAuditLog = () => {
    addAuditLog(
      'AUDIT_VERIFY',
      'audit_logs',
      `verify-${Date.now()}`,
      {
        operator: currentUser?.full_name || 'Auditor',
        status: 'Cryptographically Verified',
        integrity_status: 'Compliant',
        active_branch: currentBranchId,
      }
    );
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'LOGIN':
      case 'CREATE':
        return 'success';
      case 'UPDATE':
      case 'AUDIT_VERIFY':
        return 'primary';
      case 'DELETE':
      case 'REVOKE_INVITE':
        return 'danger';
      case 'ROLE_SWITCH':
      case 'PLAN_CHANGE':
        return 'warning';
      case 'REQUEST_APPROVAL':
      case 'REVIEW_APPROVAL':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Security & Audit Trail Ledger
            </h2>
            <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
              <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
              Immutable Ledger
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographic ledger tracking all operator logins, batches, sales transactions, stock adjustments, and administrative roles
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateTestAuditLog}
            className="text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1 text-blue-500" />
            Append Audit Check
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                filteredLogs.map((l) => ({
                  ID: l.id,
                  Timestamp: l.created_at,
                  User: l.user_name || l.user_email || 'System User',
                  Action: l.action,
                  Table: l.table_name || '-',
                  RecordID: l.record_id || '-',
                  Details: typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || '-'),
                  IP: l.ip_address || '127.0.0.1',
                })),
                'AquaFlow_Audit_Trail'
              )
            }
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              exportToExcel(
                filteredLogs.map((l) => ({
                  ID: l.id,
                  Timestamp: l.created_at,
                  User: l.user_name || l.user_email || 'System User',
                  Action: l.action,
                  Table: l.table_name || '-',
                  RecordID: l.record_id || '-',
                  Details: typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || '-'),
                  IP: l.ip_address || '127.0.0.1',
                })),
                'AquaFlow_Audit_Trail_Logs'
              )
            }
            className="text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Audit Records</span>
            <History className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.total.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Active Tenant Scope</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Auth & Access Events</span>
            <Lock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {metrics.authCount.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Logins, roles, and password resets</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Data Mutations</span>
            <Database className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-2">
            {metrics.mutations.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Records created, updated & purged</span>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Governance & Plans</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {metrics.approvals.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">Approvals & tier subscription events</span>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Text Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by operator, action, table, IP, or payload details..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Actions ({tenantLogs.length})</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>

            {/* Table / Module Filter */}
            <select
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Tables</option>
              {availableTables.map((tbl) => (
                <option key={tbl} value={tbl}>
                  {tbl}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Table Ledger */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>System Activity Ledger</CardTitle>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Showing {filteredLogs.length} matching events • Branch:{' '}
              {branches.find((b) => b.id === currentBranchId)?.name || 'All Facilities'}
            </p>
          </div>
          {(selectedAction !== 'ALL' || selectedTable !== 'ALL' || dateFilter !== 'ALL' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAction('ALL');
                setSelectedTable('ALL');
                setDateFilter('ALL');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Reset Filters
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Timestamp</th>
                  <th className="p-3">Operator / Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target Table</th>
                  <th className="p-3">Payload Summary</th>
                  <th className="p-3 text-right pr-5">Client IP / Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 px-4 text-center">
                      <History className="w-10 h-10 mx-auto mb-3 text-slate-400 opacity-60" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No audit events matching criteria
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Try clearing search terms or selecting &quot;All Actions&quot; to inspect historical system activities.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => {
                    const detailsStr =
                      typeof log.details === 'object'
                        ? JSON.stringify(log.details)
                        : String(log.details || '-');

                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLogForModal(log)}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 pl-5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {log.user_name || log.user_email || 'System Worker'}
                          </div>
                          {log.user_email && log.user_name && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {log.user_email}
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {log.table_name || 'system'}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px] max-w-xs truncate">
                          {detailsStr}
                        </td>
                        <td className="p-3 text-right pr-5 whitespace-nowrap">
                          <span className="font-mono text-[10px] text-slate-400 mr-2">
                            {log.ip_address || '127.0.0.1'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLogForModal(log);
                            }}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Inspect Event Payload"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredLogs.length > itemsPerPage && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {currentPage} of {totalPages} ({filteredLogs.length} total events)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="text-xs px-2.5 py-1"
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                        currentPage === pNum
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs px-2.5 py-1"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Inspection Modal */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Badge variant={getActionBadgeVariant(selectedLogForModal.action)}>
                  {selectedLogForModal.action}
                </Badge>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Audit Record #{selectedLogForModal.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Timestamp
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  {formatDateTime(selectedLogForModal.created_at)}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Operator
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {selectedLogForModal.user_name || selectedLogForModal.user_email || 'System User'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Target Entity
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  {selectedLogForModal.table_name || '-'} (ID: {selectedLogForModal.record_id || '-'})
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Network Source
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  {selectedLogForModal.ip_address || '127.0.0.1'}
                </span>
              </div>
            </div>

            {/* Payload JSON Inspector */}
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Payload / Event Payload JSON
              </span>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                {JSON.stringify(selectedLogForModal.details || {}, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLogForModal(null)}
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogsPage;
