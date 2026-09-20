import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Droplet,
  LayoutDashboard,
  Factory,
  Package,
  Warehouse,
  ShoppingCart,
  Users,
  Truck,
  FileText,
  BarChart3,
  Bot,
  Shield,
  Settings,
  Receipt,
  Cpu,
  History,
  TrendingUp,
  DollarSign,
  Sun,
  Moon,
  LogOut,
  Barcode,
  X,
  CreditCard,
  CheckSquare,
  Globe,
  Sparkles,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { UserRole } from '../../types/database';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: string;
  group?: 'core' | 'operations' | 'commercial' | 'financial' | 'admin';
}

interface SidebarProps {
  onClose?: () => void;
  onCloseMobile?: () => void;
  onOpenScanner?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  onClose,
  onCloseMobile,
  onOpenScanner,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const handleClose = () => {
    if (onClose) onClose();
    if (onCloseMobile) onCloseMobile();
  };
  const {
    activeRole,
    currentUser,
    logoutUser,
    theme,
    toggleTheme,
    finishedGoods,
    machines,
    currentOrganization,
    currentSubscription,
    approvalWorkflows,
    setUpgradeModalOpen,
  } = useERPStore();

  const location = useLocation();

  const lowStockCount = finishedGoods.filter((fg) => fg.current_stock <= fg.min_stock).length;
  const operationalMachines = machines.filter((m) => m.status === 'Operational').length;
  const pendingApprovals = approvalWorkflows.filter((a) => a.status === 'Pending').length;

  const allRoles: UserRole[] = [
    'owner',
    'super_admin',
    'admin',
    'factory_manager',
    'production_manager',
    'production_officer',
    'warehouse_manager',
    'warehouse_officer',
    'sales_manager',
    'sales_officer',
    'accountant',
    'auditor',
    'viewer',
  ];

  const adminRoles: UserRole[] = ['owner', 'super_admin', 'admin'];

  const navigationItems: NavItem[] = [
    // Core Dashboards
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      roles: allRoles,
      group: 'core',
    },
    {
      name: 'Production OEE',
      href: '/production-dash',
      icon: TrendingUp,
      roles: ['owner', 'super_admin', 'admin', 'factory_manager', 'production_manager', 'auditor'],
      group: 'core',
    },
    {
      name: 'Revenue Analytics',
      href: '/revenue-dash',
      icon: DollarSign,
      roles: ['owner', 'super_admin', 'admin', 'sales_manager', 'sales_officer', 'accountant', 'auditor'],
      group: 'core',
    },
    {
      name: 'Financial P&L',
      href: '/financial-dash',
      icon: DollarSign,
      roles: ['owner', 'super_admin', 'admin', 'accountant', 'auditor'],
      group: 'core',
    },

    // Operations & Manufacturing
    {
      name: 'Production',
      href: '/production',
      icon: Factory,
      roles: ['owner', 'super_admin', 'admin', 'factory_manager', 'production_manager', 'production_officer'],
      group: 'operations',
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: Package,
      roles: ['owner', 'super_admin', 'admin', 'factory_manager', 'production_manager', 'warehouse_manager', 'warehouse_officer'],
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
      group: 'operations',
    },
    {
      name: 'Warehouse',
      href: '/inventory-dash',
      icon: Warehouse,
      roles: ['owner', 'super_admin', 'admin', 'factory_manager', 'warehouse_manager', 'warehouse_officer'],
      group: 'operations',
    },
    {
      name: 'Machinery',
      href: '/machines',
      icon: Cpu,
      roles: ['owner', 'super_admin', 'admin', 'factory_manager', 'production_manager', 'production_officer'],
      badge: `${operationalMachines}/${machines.length}`,
      group: 'operations',
    },

    // Commercial & Procurement
    {
      name: 'Sales / POS',
      href: '/sales',
      icon: ShoppingCart,
      roles: ['owner', 'super_admin', 'admin', 'sales_manager', 'sales_officer', 'accountant'],
      group: 'commercial',
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: Users,
      roles: ['owner', 'super_admin', 'admin', 'sales_manager', 'sales_officer', 'accountant'],
      group: 'commercial',
    },
    {
      name: 'Suppliers',
      href: '/suppliers',
      icon: Truck,
      roles: ['owner', 'super_admin', 'admin', 'factory_manager', 'production_manager', 'warehouse_manager', 'warehouse_officer', 'accountant'],
      group: 'commercial',
    },
    {
      name: 'Purchases',
      href: '/purchases',
      icon: FileText,
      roles: ['owner', 'super_admin', 'admin', 'warehouse_manager', 'warehouse_officer', 'accountant'],
      group: 'commercial',
    },

    // Financial Control & Intelligence
    {
      name: 'Expenses',
      href: '/expenses',
      icon: Receipt,
      roles: ['owner', 'super_admin', 'admin', 'accountant'],
      group: 'financial',
    },
    {
      name: 'Approvals',
      href: '/approvals',
      icon: CheckSquare,
      roles: ['owner', 'super_admin', 'admin', 'factory_manager', 'accountant'],
      badge: pendingApprovals > 0 ? `${pendingApprovals}` : undefined,
      group: 'financial',
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: BarChart3,
      roles: allRoles.filter((r) => r !== 'production_officer'),
      group: 'financial',
    },

    // Administration & SaaS
    {
      name: 'Team & Access',
      href: '/users',
      icon: Users,
      roles: adminRoles,
      group: 'admin',
    },
    {
      name: 'Plan & Billing',
      href: '/billing',
      icon: CreditCard,
      roles: ['owner', 'super_admin', 'admin', 'accountant'],
      badge: (currentSubscription?.plan_id || 'pro').toUpperCase(),
      group: 'admin',
    },
    {
      name: 'Audit Trail',
      href: '/audit-logs',
      icon: History,
      roles: ['owner', 'super_admin', 'admin', 'auditor'],
      group: 'admin',
    },
    {
      name: 'Super Admin',
      href: '/super-admin',
      icon: Globe,
      roles: ['super_admin', 'owner'],
      group: 'admin',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      roles: adminRoles,
      group: 'admin',
    },
  ];

  // RBAC Filtering: Only display nav items permitted for current active role
  const permittedNav = navigationItems.filter((item) => item.roles.includes(activeRole));

  const roleBadgeStyle: Record<UserRole, string> = {
    owner: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    super_admin: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    admin: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    factory_manager: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    production_manager: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    production_officer: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    warehouse_manager: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    warehouse_officer: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    sales_manager: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    sales_officer: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    accountant: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    auditor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    viewer: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };

  const isLinkActive = (href: string) => {
    if (href === '/' && (location.pathname === '/' || location.pathname === '/dashboard')) {
      return true;
    }
    return location.pathname === href;
  };

  return (
    <aside
      className={`h-full bg-white dark:bg-[#09090b] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 select-none shadow-xl transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div
          className={`p-3.5 sm:p-4 flex items-center border-b border-slate-200 dark:border-slate-800/80 ${
            isCollapsed ? 'flex-col gap-2 justify-center text-center' : 'justify-between'
          }`}
        >
          <NavLink
            to="/"
            onClick={handleClose}
            className={`flex items-center gap-2.5 group cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
            title={currentOrganization?.name || 'H2O System'}
          >
            {currentOrganization?.logo_url ? (
              <img
                src={currentOrganization.logo_url}
                alt={currentOrganization.name}
                className="w-8 h-8 rounded-lg object-contain bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shadow-xs group-hover:scale-105 transition-transform shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform shrink-0">
                <Droplet className="w-5 h-5 fill-current" />
              </div>
            )}

            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white block leading-tight truncate max-w-[140px]">
                  {currentOrganization?.name || 'H2O System'}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block truncate">
                  Enterprise ERP
                </span>
              </div>
            )}
          </NavLink>

          <div className="flex items-center gap-1">
            {/* Collapse/Uncollapse widget toggle */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer hidden lg:inline-flex"
                title={isCollapsed ? 'Expand navigation (Ctrl+B)' : 'Collapse navigation (Ctrl+B)'}
                aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Mobile close button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Barcode Scanner Action Trigger */}
        <div className="px-2.5 pt-3 pb-1">
          <button
            type="button"
            onClick={() => {
              if (onOpenScanner) onOpenScanner();
              handleClose();
            }}
            title="Scan Barcode / QR (Ctrl+K -> Scanner)"
            className={`w-full rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:border-slate-300 dark:hover:border-slate-700 ${
              isCollapsed ? 'py-2 px-1' : 'py-2 px-3'
            }`}
          >
            <Barcode className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Scan Barcode / QR</span>}
          </button>
        </div>
      </div>

      {/* Navigation Scrollable Body */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1 text-xs">
        {permittedNav.map((item) => {
          const Icon = item.icon;
          const active = isLinkActive(item.href);

          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleClose}
              title={isCollapsed ? item.name : undefined}
              className={`w-full flex items-center rounded-lg font-medium transition-all duration-150 cursor-pointer text-xs ${
                isCollapsed
                  ? 'justify-center px-2 py-2.5 relative group'
                  : 'justify-between px-3 py-2'
              } ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
                />
                {!isCollapsed && <span>{item.name}</span>}
              </div>

              {item.badge && !isCollapsed && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {item.badge && isCollapsed && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile & Utility Section */}
      <div className="p-2 sm:p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/80 dark:bg-[#09090b]">
        {/* Role Badge & Theme Switcher Bar */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-1">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${
                roleBadgeStyle[activeRole || 'super_admin'] ||
                'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {(activeRole || 'super_admin').replace('_', ' ')}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-blue-600" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-blue-600" />
              )}
            </button>
          </div>
        )}

        {/* User Card with Signout */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 shadow-xs">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/50">
                {currentUser?.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser?.full_name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (currentUser?.full_name || currentUser?.email || 'US').slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {currentUser?.full_name || 'Authorized User'}
                </p>
                <p className="text-[10px] text-slate-500 truncate leading-tight">
                  {currentUser?.email || ''}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => logoutUser()}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div
              title={currentUser?.full_name || 'Authorized User'}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-600 dark:text-blue-400 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/50"
            >
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser?.full_name || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                (currentUser?.full_name || currentUser?.email || 'US').slice(0, 2).toUpperCase()
              )}
            </div>
            <button
              type="button"
              onClick={() => logoutUser()}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
