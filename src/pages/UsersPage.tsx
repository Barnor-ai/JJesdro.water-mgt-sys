import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  UserCheck,
  Mail,
  Phone,
  Check,
  X,
  Copy,
  Trash2,
  Lock,
  Clock,
  Send,
  Zap,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ChevronDown,
  ChevronUp,
  Server,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { OrganizationRole, UserRole } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatDateTime } from '../lib/utils';
import {
  getInvitationRedirectUrl,
  getLastInvitationDiagnostic,
  subscribeToDiagnostic,
  InvitationDiagnosticInfo,
} from '../lib/invitationService';
import { isSupabaseConfigured } from '../lib/supabase';

export function UsersPage() {
  const {
    organizationMembers,
    invitations,
    currentOrganization,
    currentSubscription,
    subscriptionPlans,
    inviteMember,
    resendInvitation,
    revokeInvitation,
    updateMemberRole,
    toggleMemberStatus,
    removeMember,
    checkLimit,
    setUpgradeModalOpen,
    currentUser,
    activeRole,
  } = useERPStore();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('production_manager');
  const [inviteError, setInviteError] = useState('');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteSuccessInfo, setInviteSuccessInfo] = useState<{
    email: string;
    emailSent: boolean;
    message: string;
    inviteLink?: string;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Invitation Diagnostic & SMTP Troubleshooting States
  const [diagnosticInfo, setDiagnosticInfo] = useState<InvitationDiagnosticInfo | null>(getLastInvitationDiagnostic);
  const [isDiagnosticExpanded, setIsDiagnosticExpanded] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  useEffect(() => {
    const unsub = subscribeToDiagnostic((info) => {
      setDiagnosticInfo(info);
      if (info.edgeFunctionStatus === 'ERROR' || info.authAdminStatus === 'REJECTED') {
        setIsDiagnosticExpanded(true);
      }
    });
    return unsub;
  }, []);

  // Permission Matrix State & Management
  const [isAddPermModalOpen, setIsAddPermModalOpen] = useState(false);
  const [newPermModule, setNewPermModule] = useState('');
  const [permSuccessMsg, setPermSuccessMsg] = useState(false);

  const userRole = (currentUser?.role || activeRole || 'viewer').toLowerCase();
  const canManageTeam =
    userRole === 'owner' || userRole === 'admin' || userRole === 'super_admin';

  interface RolePerm {
    id: string;
    module: string;
    owner: boolean;
    admin: boolean;
    prod_mgr: boolean;
    wh_mgr: boolean;
    sales_mgr: boolean;
    acc: boolean;
    aud: boolean;
    vwr: boolean;
    isCustom?: boolean;
  }

  const defaultRoleMatrix: RolePerm[] = [
    { id: 'perm-1', module: 'Executive Overview', owner: true, admin: true, prod_mgr: true, wh_mgr: true, sales_mgr: true, acc: true, aud: true, vwr: true },
    { id: 'perm-2', module: 'Production Batches & Quality', owner: true, admin: true, prod_mgr: true, wh_mgr: false, sales_mgr: false, acc: false, aud: true, vwr: false },
    { id: 'perm-3', module: 'Machinery & Equipment Controls', owner: true, admin: true, prod_mgr: true, wh_mgr: false, sales_mgr: false, acc: false, aud: false, vwr: false },
    { id: 'perm-4', module: 'Warehouse Stock & Transfers', owner: true, admin: true, prod_mgr: true, wh_mgr: true, sales_mgr: false, acc: false, aud: true, vwr: false },
    { id: 'perm-5', module: 'POS Sales & Customer Invoicing', owner: true, admin: true, prod_mgr: false, wh_mgr: false, sales_mgr: true, acc: true, aud: true, vwr: false },
    { id: 'perm-6', module: 'Accounts Receivable & Debtors', owner: true, admin: true, prod_mgr: false, wh_mgr: false, sales_mgr: true, acc: true, aud: true, vwr: false },
    { id: 'perm-7', module: 'Financial P&L & Expenses', owner: true, admin: true, prod_mgr: false, wh_mgr: false, sales_mgr: false, acc: true, aud: true, vwr: false },
    { id: 'perm-8', module: 'Approval Authorization', owner: true, admin: true, prod_mgr: true, wh_mgr: false, sales_mgr: false, acc: true, aud: false, vwr: false },
    { id: 'perm-9', module: 'Subscription & Billing', owner: true, admin: true, prod_mgr: false, wh_mgr: false, sales_mgr: false, acc: true, aud: false, vwr: false },
    { id: 'perm-10', module: 'Audit Trail Logs', owner: true, admin: true, prod_mgr: false, wh_mgr: false, sales_mgr: false, acc: false, aud: true, vwr: false },
  ];

  const [roleMatrix, setRoleMatrix] = useState<RolePerm[]>(() => {
    try {
      const saved = localStorage.getItem('h2o_role_permissions_matrix');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return defaultRoleMatrix;
  });

  const savePermissions = (updated: RolePerm[]) => {
    setRoleMatrix(updated);
    try {
      localStorage.setItem('h2o_role_permissions_matrix', JSON.stringify(updated));
    } catch {}
    setPermSuccessMsg(true);
    setTimeout(() => setPermSuccessMsg(false), 2500);
  };

  const handleTogglePermission = (id: string, roleKey: keyof Omit<RolePerm, 'id' | 'module' | 'isCustom'>) => {
    if (!canManageTeam || roleKey === 'owner') return;
    const updated = roleMatrix.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          [roleKey]: !item[roleKey],
        };
      }
      return item;
    });
    savePermissions(updated);
  };

  const handleAddCustomPermission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermModule.trim()) return;

    const newPerm: RolePerm = {
      id: `perm-custom-${Date.now()}`,
      module: newPermModule.trim(),
      owner: true,
      admin: true,
      prod_mgr: false,
      wh_mgr: false,
      sales_mgr: false,
      acc: false,
      aud: false,
      vwr: false,
      isCustom: true,
    };

    savePermissions([...roleMatrix, newPerm]);
    setNewPermModule('');
    setIsAddPermModalOpen(false);
  };

  const handleRemovePermission = (id: string) => {
    if (!canManageTeam) return;
    const updated = roleMatrix.filter((item) => item.id !== id);
    savePermissions(updated);
  };

  const activePlan =
    subscriptionPlans.find((p) => p.id === currentSubscription?.plan_id) || subscriptionPlans[1];

  const activeMembers = organizationMembers.filter(
    (m) => m.organization_id === currentOrganization?.id
  );
  const activeCount = activeMembers.filter((m) => m.is_active).length;
  const maxUsers = activePlan.maxUsers;
  const isAtLimit = activeCount >= maxUsers;

  const currentOrgInvites = invitations.filter(
    (i) => i.organization_id === currentOrganization?.id && i.status === 'pending'
  );

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError('Please enter a valid email address.');
      return;
    }
    setInviteError('');
    setIsSubmittingInvite(true);
    setInviteSuccessInfo(null);

    const result = await inviteMember(inviteEmail, inviteRole, inviteName);
    setIsSubmittingInvite(false);

    if (result.success) {
      setInviteSuccessInfo({
        email: inviteEmail.trim().toLowerCase(),
        emailSent: Boolean(result.emailSent),
        message: result.message || `Invitation dispatched to ${inviteEmail}.`,
        inviteLink: result.inviteLink,
      });
      setInviteEmail('');
      setInviteName('');
      setInviteError('');
    } else if (result.error) {
      setInviteError(result.error);
    }
  };

  const handleResend = async (id: string) => {
    setResendingId(id);
    await resendInvitation(id);
    setResendingId(null);
  };

  const handleCopyLink = (token: string) => {
    const inviteUrl = `${getInvitationRedirectUrl()}?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Plan Capacity Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Workspace Team & Role-Based Access (RBAC)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage organization team members, invite new staff, and govern department authorization limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {activeCount} of {maxUsers > 1000 ? '∞' : maxUsers} Seats Used
            </span>
            <span className="text-[11px] text-slate-500">
              Plan: {activePlan.name}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (isAtLimit) {
                setUpgradeModalOpen(
                  true,
                  `You have reached your ${maxUsers} user limit on the ${activePlan.name} plan. Upgrade to invite additional staff.`
                );
              } else {
                setIsInviteModalOpen(true);
              }
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Invite Staff Member
          </Button>
        </div>
      </div>

      {/* Limit Alert Banner if near or at limit */}
      {isAtLimit && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold text-amber-800 dark:text-amber-300">User limit reached:</span>{' '}
              <span className="text-slate-700 dark:text-slate-300">
                Your workspace is currently using all {maxUsers} staff seats allocated on the {activePlan.name} plan.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true, 'Upgrade to unlock more user seats.')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold shrink-0 cursor-pointer shadow-xs"
          >
            Upgrade Tier
          </button>
        </div>
      )}

      {/* Active Organization Members Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Workspace Members ({activeMembers.length})</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff members actively provisioned inside {currentOrganization?.name || 'Workspace'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Member</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeMembers.map((m, idx) => (
                  <tr key={`${m.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                          {(m.full_name || m.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {m.full_name}
                            {m.role === 'owner' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                Owner
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {m.role === 'owner' ? (
                        <Badge variant="warning" size="sm" className="capitalize font-semibold">
                          Workspace Owner
                        </Badge>
                      ) : canManageTeam ? (
                        <select
                          value={m.role}
                          onChange={(e) => updateMemberRole(m.id, e.target.value as OrganizationRole)}
                          className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="production_manager">Production Manager</option>
                          <option value="production_officer">Production Operator</option>
                          <option value="warehouse_manager">Warehouse Manager</option>
                          <option value="warehouse_officer">Warehouse Officer</option>
                          <option value="sales_manager">Sales Director</option>
                          <option value="sales_officer">Sales Officer</option>
                          <option value="accountant">Accountant</option>
                          <option value="auditor">Auditor</option>
                          <option value="viewer">Viewer (Read-Only)</option>
                        </select>
                      ) : (
                        <Badge variant="secondary" size="sm" className="capitalize font-medium">
                          {(m.role || 'viewer').replace('_', ' ')}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{m.phone || '—'}</td>
                    <td className="p-3">
                      {canManageTeam ? (
                        <button
                          type="button"
                          onClick={() => toggleMemberStatus(m.id)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            m.is_active
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300'
                          }`}
                        >
                          {m.is_active ? 'Active' : 'Disabled'}
                        </button>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.is_active
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {m.is_active ? 'Active' : 'Disabled'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right pr-5">
                      {canManageTeam && m.role !== 'owner' ? (
                        <button
                          type="button"
                          onClick={() => removeMember(m.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations Section */}
      {currentOrgInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Organization Invitations ({currentOrgInvites.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5 pl-5">Invited Email</th>
                    <th className="p-3">Proposed Role</th>
                    <th className="p-3">Dispatched By</th>
                    <th className="p-3">Expires At</th>
                    <th className="p-3 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentOrgInvites.map((inv, idx) => (
                    <tr key={`${inv.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 pl-5 font-semibold text-slate-900 dark:text-white">
                        {inv.email}
                      </td>
                      <td className="p-3 capitalize text-slate-600 dark:text-slate-300">
                        {(inv.role || 'operator').replace('_', ' ')}
                      </td>
                      <td className="p-3 text-slate-500">
                        {inv.invited_by_name || 'Admin'}
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right pr-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={resendingId === inv.id}
                            onClick={() => handleResend(inv.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            title="Resend invitation email and refresh 7-day validity"
                          >
                            {resendingId === inv.id ? (
                              <>
                                <RefreshCw className="w-3 h-3 text-sky-500 animate-spin" /> Resending...
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3 text-sky-500" /> Resend
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inv.token)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            {copiedToken === inv.token ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-blue-500" /> Copy Link
                              </>
                            )}
                          </button>
                          {canManageTeam && (
                            <button
                              type="button"
                              onClick={() => revokeInvitation(inv.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              title="Revoke Invitation"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Temporary Admin Diagnostic & Email Delivery Pipeline (Requirement 14 & 6) */}
      {canManageTeam && (
        <Card className="border border-sky-500/30 bg-slate-900/40 dark:bg-slate-900/60 shadow-lg overflow-hidden">
          <CardHeader
            className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-row items-center justify-between cursor-pointer select-none"
            onClick={() => setIsDiagnosticExpanded(!isDiagnosticExpanded)}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold text-white">
                    Invitation & Email Delivery Pipeline Diagnostic
                  </CardTitle>
                  <Badge variant={diagnosticInfo?.edgeFunctionStatus === 'SUCCESS' ? 'success' : 'outline'} size="sm">
                    {diagnosticInfo?.edgeFunctionStatus === 'SUCCESS' ? 'Pipeline Active' : 'Troubleshooting Active'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400">
                  Real-time verification of Frontend → Edge Function → Supabase Auth → SMTP delivery
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTemplateModal(true);
                }}
                className="text-[11px] h-7 px-2.5"
              >
                <FileText className="w-3 h-3 mr-1 text-sky-400" /> View Supabase Template
              </Button>
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-white transition-colors"
                aria-label="Toggle diagnostic details"
              >
                {isDiagnosticExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </CardHeader>

          {isDiagnosticExpanded && (
            <CardContent className="p-4 space-y-4 text-xs">
              {/* 5-Stage Architecture Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-center">
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Stage 1</span>
                  <span className="font-semibold text-white block text-xs">Client Request</span>
                  <span className="text-[10px] text-emerald-400 flex items-center justify-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Validated
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Stage 2</span>
                  <span className="font-semibold text-white block text-xs">invite-user Function</span>
                  <span className="text-[10px] text-emerald-400 flex items-center justify-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Server-Side Secret
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Stage 3</span>
                  <span className="font-semibold text-white block text-xs">Supabase Auth</span>
                  <span className="text-[10px] text-emerald-400 flex items-center justify-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> Admin API
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Stage 4</span>
                  <span className="font-semibold text-white block text-xs">SMTP Delivery</span>
                  <span className="text-[10px] text-sky-400 flex items-center justify-center gap-1 mt-1">
                    <Mail className="w-3 h-3" /> Custom SMTP / Provider
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Stage 5</span>
                  <span className="font-semibold text-white block text-xs">Acceptance Route</span>
                  <span className="text-[10px] text-emerald-400 flex items-center justify-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" /> SPA Routed (Netlify 200)
                  </span>
                </div>
              </div>

              {/* Production Configuration & SMTP Warning Box */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Important Production SMTP Dependency
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  The default Supabase Auth email server has a strict rate limit of <strong>3 emails/hour</strong>. For production commercial delivery to work reliably without delay, a custom SMTP provider (<strong>Resend</strong>, <strong>SendGrid</strong>, <strong>Postmark</strong>, or <strong>AWS SES</strong>) must be enabled in your <span className="text-white font-mono">Supabase Dashboard → Authentication → SMTP Settings</span>.
                </p>
              </div>

              {/* Last Dispatched Invitation Audit Log */}
              {diagnosticInfo ? (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-sky-400" />
                      Last Invitation Audit Log
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDateTime(diagnosticInfo.timestamp)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Recipient Email:</span>{' '}
                      <span className="font-mono font-semibold text-white">{diagnosticInfo.recipient}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Stage:</span>{' '}
                      <span className="font-semibold text-slate-200">{diagnosticInfo.stage}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Edge Function:</span>{' '}
                      <span className={diagnosticInfo.edgeFunctionStatus === 'SUCCESS' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {diagnosticInfo.edgeFunctionStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Supabase Auth Admin:</span>{' '}
                      <span className={diagnosticInfo.authAdminStatus === 'DELIVERED_TO_SMTP' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {diagnosticInfo.authAdminStatus}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400">Redirect URL:</span>{' '}
                      <span className="font-mono text-sky-400 break-all">{diagnosticInfo.redirectUrl}</span>
                    </div>
                    {diagnosticInfo.errorMessage && (
                      <div className="sm:col-span-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                        <span className="font-bold">Error Message:</span> {diagnosticInfo.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic text-center py-2">
                  No invitation dispatched in this session yet. Use the "Invite Staff Member" button above to test the pipeline.
                </p>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* RBAC Permission Matrix */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle>Role Permission & Security Matrix</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Role-based authorization and departmental access policies across modules
            </p>
          </div>
          <div className="flex items-center gap-3">
            {permSuccessMsg && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Permissions Saved
              </span>
            )}
            {canManageTeam && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddPermModalOpen(true)}
                className="text-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Permission
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Feature Module</th>
                  <th className="p-3 text-center">Owner</th>
                  <th className="p-3 text-center">Admin</th>
                  <th className="p-3 text-center">Production</th>
                  <th className="p-3 text-center">Warehouse</th>
                  <th className="p-3 text-center">Sales</th>
                  <th className="p-3 text-center">Finance</th>
                  <th className="p-3 text-center">Auditor</th>
                  <th className="p-3 text-center">Viewer</th>
                  {canManageTeam && <th className="p-3 text-center pr-5 w-12">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {roleMatrix.map((rm) => (
                  <tr key={rm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 pl-5 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{rm.module}</span>
                        {rm.isCustom && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                            Custom
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                    </td>
                    {(
                      [
                        'admin',
                        'prod_mgr',
                        'wh_mgr',
                        'sales_mgr',
                        'acc',
                        'aud',
                        'vwr',
                      ] as const
                    ).map((roleKey) => (
                      <td key={roleKey} className="p-3 text-center">
                        <button
                          type="button"
                          disabled={!canManageTeam}
                          onClick={() => handleTogglePermission(rm.id, roleKey)}
                          className={`p-1 rounded-md transition-colors ${
                            canManageTeam
                              ? 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                              : 'cursor-default opacity-90'
                          }`}
                          title={
                            canManageTeam
                              ? `Click to ${rm[roleKey] ? 'revoke' : 'grant'} permission`
                              : undefined
                          }
                        >
                          {rm[roleKey] ? (
                            <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                          )}
                        </button>
                      </td>
                    ))}
                    {canManageTeam && (
                      <td className="p-3 text-center pr-5">
                        {rm.isCustom ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePermission(rm.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                            title="Remove Permission"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Custom Permission Modal */}
      <Modal
        isOpen={isAddPermModalOpen}
        onClose={() => setIsAddPermModalOpen(false)}
        title="Add Role Permission"
        description="Define a new department feature permission policy for this workspace."
        maxWidth="sm"
      >
        <form onSubmit={handleAddCustomPermission} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Permission / Module Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Chemical Lab Sampling & QA"
              value={newPermModule}
              onChange={(e) => setNewPermModule(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Once created, authorized administrators can toggle access for each departmental role.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddPermModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Permission
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setInviteSuccessInfo(null);
          setInviteError('');
        }}
        title="Invite Staff to Workspace"
        description={`Send an invitation to join ${currentOrganization?.name || 'Workspace'} with specific role permissions.`}
        maxWidth="md"
      >
        {inviteSuccessInfo ? (
          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                Invitation Dispatched Successfully!
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Supabase Auth accepted the invitation email for <strong className="text-white">{inviteSuccessInfo.email}</strong>.
                Please advise the team member to check their <strong>Inbox</strong> and <strong>Spam folder</strong>.
              </p>
            </div>

            {inviteSuccessInfo.inviteLink && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 block">
                  Direct Invitation Link (Backup)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteSuccessInfo.inviteLink}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 select-all"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(inviteSuccessInfo.inviteLink?.split('token=')[1] || '')}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1 text-sky-400" /> Copy
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500">
                  If email delivery is delayed by the recipient's mail provider, you can send them this direct setup link.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInviteSuccessInfo(null)}
              >
                Invite Another Member
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteSuccessInfo(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
            {inviteError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Staff Full Name
              </label>
              <input
                type="text"
                disabled={isSubmittingInvite}
                placeholder="e.g. Jonathan Hayes"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Email Address *
              </label>
              <input
                type="email"
                required
                disabled={isSubmittingInvite}
                placeholder="staff@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Operational Role *
              </label>
              <select
                disabled={isSubmittingInvite}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none disabled:opacity-60"
              >
                <option value="admin">Admin (Plant Operations & Configuration)</option>
                <option value="production_manager">Production Manager (Blowing, RO & Bottling)</option>
                <option value="production_officer">Production Operator (Machine Floor)</option>
                <option value="warehouse_manager">Warehouse Lead (Inventory & Dispatch)</option>
                <option value="warehouse_officer">Warehouse Officer (Stock Movement)</option>
                <option value="sales_manager">Sales Director (Accounts & Pricing)</option>
                <option value="sales_officer">Sales Officer (Invoicing & POS)</option>
                <option value="accountant">Accountant (Financial Statements & OPEX)</option>
                <option value="auditor">Auditor (Compliance & Audit Trails)</option>
                <option value="viewer">Viewer (Read-Only Dashboard)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                type="button"
                disabled={isSubmittingInvite}
                onClick={() => setIsInviteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmittingInvite}>
                {isSubmittingInvite ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Dispatching Email...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Dispatch Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Supabase Email Template Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Supabase 'Invite User' Email Template"
        description="Paste this verified Go template into Supabase Dashboard -> Authentication -> Email Templates -> Invite User"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-slate-400 block text-[11px]">Subject Line:</span>
            <span className="font-mono text-white select-all">{"You have been invited to join {{ .SiteURL }}"}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400 block text-[11px]">HTML Email Template:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const tpl = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #0284c7; margin-top: 0;">Welcome to H2O Water Management System</h2>
  <p>Hello,</p>
  <p>You have been invited to join the <strong>H2O Water Management System</strong> workspace.</p>
  <p>To accept your invitation and complete your account setup, please click the button below:</p>
  <div style="margin: 28px 0; text-align: center;">
    <a href="{{ .ConfirmationURL }}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      Accept Invitation
    </a>
  </div>
  <p style="font-size: 13px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:</p>
  <p style="font-size: 13px; word-break: break-all;"><a href="{{ .ConfirmationURL }}" style="color: #0284c7;">{{ .ConfirmationURL }}</a></p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">
    This invitation link will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.
    For assistance, contact your organization administrator.
  </p>
</div>`;
                  navigator.clipboard.writeText(tpl);
                  setCopiedTemplate(true);
                  setTimeout(() => setCopiedTemplate(false), 2500);
                }}
              >
                {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedTemplate ? 'Copied Template!' : 'Copy Template Code'}
              </Button>
            </div>
            <pre className="p-3 rounded bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed select-all">
{`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #0284c7; margin-top: 0;">Welcome to H2O Water Management System</h2>
  <p>Hello,</p>
  <p>You have been invited to join the <strong>H2O Water Management System</strong> workspace.</p>
  <p>To accept your invitation and complete your account setup, please click the button below:</p>
  <div style="margin: 28px 0; text-align: center;">
    <a href="{{ .ConfirmationURL }}" style="background-color: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      Accept Invitation
    </a>
  </div>
  <p style="font-size: 13px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:</p>
  <p style="font-size: 13px; word-break: break-all;"><a href="{{ .ConfirmationURL }}" style="color: #0284c7;">{{ .ConfirmationURL }}</a></p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
  <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">
    This invitation link will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.
    For assistance, contact your organization administrator.
  </p>
</div>`}
            </pre>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setShowTemplateModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
