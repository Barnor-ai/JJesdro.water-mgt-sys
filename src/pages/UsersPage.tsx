import React, { useState } from 'react';
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
} from 'lucide-react';
import { useERPStore } from '../store/useStore';
import { OrganizationRole, UserRole } from '../types/database';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatDateTime } from '../lib/utils';

export function UsersPage() {
  const {
    organizationMembers,
    invitations,
    currentOrganization,
    currentSubscription,
    subscriptionPlans,
    inviteMember,
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
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

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
    const result = await inviteMember(inviteEmail, inviteRole, inviteName);
    if (result.success) {
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
    }
  };

  const handleCopyLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const roleMatrix = [
    { module: 'Executive Overview', owner: true, admin: true, prod_mgr: true, wh_mgr: true, sales_mgr: true, acc: true, aud: true, vwr: true },
    { module: 'Production Batches & Quality', owner: true, admin: true, prod_mgr: true, wh_mgr: false, sales_mgr: false, acc: false, aud: true, vwr: false },
    { module: 'Warehouse Stock & Transfers', owner: true, admin: true, prod_mgr: true, wh_mgr: true, sales_mgr: false, acc: false, aud: true, vwr: false },
    { module: 'POS Sales & Customer Invoicing', owner: true, admin: true, prod_mgr: false, wh_mgr: false, sales_mgr: true, acc: true, aud: true, vwr: false },
    { module: 'Accounts Receivable & Debtors', owner: true, admin: true, prod_mgr: false, wh_mgr: false, sales_mgr: true, acc: true, aud: true, vwr: false },
    { module: 'Financial P&L & Expenses', owner: true, admin: true, prod_mgr: false, wh_mgr: false, sales_mgr: false, acc: true, aud: true, vwr: false },
    { module: 'Approval Authorization', owner: true, admin: true, prod_mgr: true, wh_mgr: false, sales_mgr: false, acc: true, aud: false, vwr: false },
    { module: 'Subscription & Billing', owner: true, admin: true, prod_mgr: false, wh_mgr: false, sales_mgr: false, acc: true, aud: false, vwr: false },
    { module: 'Audit Trail Logs', owner: true, admin: true, prod_mgr: false, wh_mgr: false, sales_mgr: false, acc: false, aud: true, vwr: false },
  ];

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
                {activeMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
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
                      ) : (
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
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{m.phone || '—'}</td>
                    <td className="p-3">
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
                    </td>
                    <td className="p-3 text-right pr-5">
                      {m.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => removeMember(m.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
                  {currentOrgInvites.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
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
                          <button
                            type="button"
                            onClick={() => revokeInvitation(inv.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Revoke Invitation"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
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

      {/* RBAC Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permission & Security Matrix</CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enforced policies based on Supabase PostgreSQL Row-Level Security (RLS)
          </p>
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
                  <th className="p-3 text-center pr-5">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {roleMatrix.map((rm, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 pl-5 font-semibold text-slate-900 dark:text-white">
                      {rm.module}
                    </td>
                    <td className="p-3 text-center">
                      {rm.owner ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {rm.admin ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {rm.prod_mgr ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {rm.wh_mgr ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {rm.sales_mgr ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {rm.acc ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {rm.aud ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="p-3 text-center pr-5">
                      {rm.vwr ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Send Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Staff to Workspace"
        description={`Send an invitation to join ${currentOrganization?.name || 'Workspace'} with specific role permissions.`}
        maxWidth="md"
      >
        <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Staff Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Jonathan Hayes"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Official Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="staff@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Assigned Operational Role *
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
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
            <Button variant="outline" type="button" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Send className="w-3.5 h-3.5 mr-1.5" /> Dispatch Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
