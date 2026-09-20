import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Info,
  Sun,
  Moon,
  Database,
  Droplet,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Key,
  Camera,
  Upload,
  User,
  X,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { useERPStore } from '../../store/useStore';
import { Badge } from '../ui/Badge';
import { formatDateTime } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { SupabaseStatusModal } from '../supabase/SupabaseStatusModal';

interface HeaderProps {
  onToggleSidebar?: () => void;
  onMenuClick?: () => void;
  onOpenSearch?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export function Header({
  onToggleSidebar,
  onMenuClick,
  onOpenSearch,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}: HeaderProps) {
  const handleToggle = () => {
    if (onMenuClick) onMenuClick();
    if (onToggleSidebar) onToggleSidebar();
  };

  const {
    currentUser,
    activeRole,
    logoutUser,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    theme,
    toggleTheme,
    currentOrganization,
    updateCurrentUserProfile,
    updateSupabasePassword,
  } = useERPStore();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Password modal state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Profile photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const navigate = useNavigate();
  const unreadNotifs = notifications.filter((n) => !n.read);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#user-profile-dropdown') && !target.closest('#user-profile-button')) {
        setIsUserMenuOpen(false);
      }
      if (!target.closest('#notifications-dropdown') && !target.closest('#notifications-button')) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo size must be less than 5MB.');
      return;
    }

    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        updateCurrentUserProfile({ avatar_url: result });
      }
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    updateCurrentUserProfile({ avatar_url: '' });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await updateSupabasePassword(newPassword);
      if (res.success) {
        setPasswordSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordSuccess(null);
        }, 1500);
      } else {
        setPasswordError(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Error updating password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const userInitials = (currentUser?.full_name || currentUser?.email || 'AD')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 flex items-center justify-between transition-colors shadow-xs">
      {/* Left Section: Collapse/Uncollapse widget + Company Brand Name (ALWAYS DISPLAYED) */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={handleToggle}
          className="inline-flex lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="Open sidebar menu"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapse / Uncollapse Widget */}
        <button
          type="button"
          onClick={onToggleSidebarCollapse}
          className="hidden lg:inline-flex items-center justify-center p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shadow-xs group shrink-0"
          aria-label={isSidebarCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
          title={isSidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 transition-transform group-hover:scale-110 text-blue-600 dark:text-blue-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4 transition-transform group-hover:scale-110" />
          )}
        </button>

        {/* Company Name & Official Brand - ALWAYS DISPLAYED ON APP */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs max-w-[200px] sm:max-w-[280px] md:max-w-[340px] lg:max-w-[380px] shrink-0">
          {currentOrganization?.logo_url ? (
            <img
              src={currentOrganization.logo_url}
              alt={currentOrganization.name || 'Company Logo'}
              className="w-7 h-7 rounded-lg object-contain bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700/80 shrink-0 shadow-xs"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs shadow-blue-600/30">
              <Droplet className="w-4 h-4 fill-current" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate leading-tight tracking-tight">
              {currentOrganization?.name || 'H2O Pure Bottled Water Corp.'}
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 leading-none mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">Enterprise Workspace</span>
            </span>
          </div>
        </div>

        {/* Global Search Bar (Cmd + K) */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden md:flex items-center bg-slate-100/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 px-3 py-1.5 rounded-lg w-36 lg:w-60 gap-2 text-slate-500 dark:text-slate-400 text-xs transition-colors cursor-pointer shadow-xs"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="truncate text-slate-500 dark:text-slate-400 text-xs text-left flex-1">
            Search operations...
          </span>
          <span className="text-[10px] bg-white dark:bg-slate-800 px-1 py-0.5 rounded text-slate-500 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700/60 shadow-xs">
            ⌘K
          </span>
        </button>
      </div>

      {/* Right Section: System Online, Dark/Light Mode, Notifications, and Far Top Right User Profile Dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* System Online Status Badge */}
        <button
          type="button"
          onClick={() => setIsSupabaseModalOpen(true)}
          title="System Online - Local Engine Active"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 shadow-xs"
          aria-label="System status"
        >
          <Database className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            Online
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        </button>

        {/* Dark / Light Mode Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 shadow-xs"
          aria-label="Toggle light and dark mode"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="notifications-button"
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 shadow-xs"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="w-2 h-2 bg-red-500 rounded-full absolute top-1.5 right-1.5 border border-white dark:border-[#09090b]" />
            )}
          </button>

          {isNotifOpen && (
            <div
              id="notifications-dropdown"
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Notifications</h4>
                  <Badge variant="secondary" size="sm">
                    {unreadNotifs.length} new
                  </Badge>
                </div>
                {unreadNotifs.length > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsAsRead}
                    className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 py-2">
                {notifications.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-4">No notifications yet</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationAsRead(notif.id);
                        if (notif.link) {
                          const route = notif.link.startsWith('/') ? notif.link : `/${notif.link}`;
                          navigate(route);
                          setIsNotifOpen(false);
                        }
                      }}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        notif.read
                          ? 'bg-transparent border-transparent text-slate-500 dark:text-slate-400'
                          : 'bg-slate-100/90 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {notif.type === 'alert' && (
                          <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                        )}
                        {notif.type === 'warning' && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                        )}
                        {notif.type === 'success' && (
                          <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        {notif.type === 'info' && (
                          <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {notif.title}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-tight mt-0.5">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                            {formatDateTime(notif.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* FAR TOP RIGHT CORNER: USER PHOTO AVATAR & DROPDOWN MENU */}
        <div className="relative">
          {/* Hidden File Input for Avatar Photo Upload */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg, image/webp"
            onChange={handlePhotoUpload}
            className="hidden"
          />

          <button
            id="user-profile-button"
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1 pr-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors cursor-pointer group shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-expanded={isUserMenuOpen}
            aria-label="User account menu"
            title="User Account Menu"
          >
            {/* Avatar Circle with Photo or Initials */}
            <div className="relative w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-xs ring-2 ring-white dark:ring-slate-900">
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser?.full_name || 'User Profile Photo'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>

            <span className="hidden sm:inline-block text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[110px] truncate text-left">
              {currentUser?.full_name?.split(' ')[0] || 'Account'}
            </span>

            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${
                isUserMenuOpen ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </button>

          {/* User Profile Dropdown Menu */}
          {isUserMenuOpen && (
            <div
              id="user-profile-dropdown"
              className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95"
            >
              {/* Profile Card & Photo Uploader Header */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 mb-2">
                <div className="flex items-center gap-3">
                  {/* Photo with Camera Overlay for Quick Upload */}
                  <div className="relative group/avatar shrink-0">
                    <div className="w-13 h-13 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-base overflow-hidden ring-2 ring-blue-500/30 shadow-md">
                      {currentUser?.avatar_url ? (
                        <img
                          src={currentUser.avatar_url}
                          alt={currentUser?.full_name || 'User Photo'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{userInitials}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload or Change Photo"
                      className="absolute inset-0 rounded-full bg-black/50 text-white opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-[1px]"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Name, Email and Role info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                      {currentUser?.full_name || 'Enterprise User'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {currentUser?.email || 'user@h2opure.com'}
                    </p>
                    <span className="inline-block text-[9px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 mt-1 border border-blue-200 dark:border-blue-800">
                      {(activeRole || currentUser?.role || 'User').replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Direct Photo Action Button Row */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3 h-3 text-blue-500" />
                    <span>{currentUser?.avatar_url ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>

                  {currentUser?.avatar_url && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-medium transition-colors cursor-pointer"
                      title="Remove custom photo"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {photoError && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1.5">{photoError}</p>
                )}
              </div>

              {/* Menu Navigation Items */}
              <div className="space-y-0.5 text-xs">
                {/* 1. Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="flex-1">Settings</span>
                  <span className="text-[10px] text-slate-400 font-normal">Profile & Config</span>
                </button>

                {/* 2. Change Password */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsPasswordModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors cursor-pointer text-left"
                >
                  <Key className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="flex-1">Change Password</span>
                  <span className="text-[10px] text-slate-400 font-normal">Security</span>
                </button>

                {/* Divider */}
                <div className="my-1.5 border-t border-slate-200 dark:border-slate-800" />

                {/* 3. Log Out */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logoutUser();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="flex-1">Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            {/* Close Modal Button */}
            <button
              type="button"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setPasswordError(null);
                setPasswordSuccess(null);
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Change Account Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update credentials for {currentUser?.email}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    required
                    className="w-full px-3 py-2 pr-10 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Error or Success feedback */}
              {passwordError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supabase Status and Management Modal */}
      <SupabaseStatusModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </header>
  );
}

export default Header;
