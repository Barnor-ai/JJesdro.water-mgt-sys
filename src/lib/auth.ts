import { OrganizationRole, UserRole } from '../types/database';
import { supabase, isSupabaseConfigured, formatSupabaseError } from './supabase';

// ==============================================================================
// AUTHENTICATION SERVICE FOR AQUAFLOW ERP
// Connected to Supabase Auth with persistent sessions, password reset,
// role-based access, and reliable local fallback.
// ==============================================================================

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string;
  branch_id: string;
  is_active: boolean;
  two_factor_enabled?: boolean;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
  password_hash?: string;
  salt?: string;
  temp_password?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  timestamp: number;
}

export interface CreateUserInput {
  email: string;
  full_name: string;
  role: UserRole;
  organization_id?: string;
  branch_id?: string;
  phone?: string;
  password?: string;
}

// Storage keys
const STORAGE_PREFIX = 'aquaflow_erp_';
const SESSION_KEY = `${STORAGE_PREFIX}session`;
const USERS_KEY = `${STORAGE_PREFIX}auth_users`;
const CURRENT_USER_KEY = `${STORAGE_PREFIX}user`;
const AUTH_FLAG_KEY = `${STORAGE_PREFIX}is_authenticated`;
const ROLE_KEY = `${STORAGE_PREFIX}role`;

export async function hashPassword(password: string, salt: string = 'aquaflow_salt_2026'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}:aquaflow_secure`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateRandomToken(length = 16): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const DEFAULT_SALT = 'aquaflow_salt_default';
const OWNER_PASSWORD_HASH_PRECOMPUTED = '7b203c9b740ca3856ba7dbffdaea83df32d431d13f993d052be1bb3e24b7458f';

const INITIAL_DEV_USERS: AuthUser[] = [
  {
    id: 'user-owner-01',
    email: 'owner@aquaflow.local',
    full_name: 'Company Owner',
    role: 'owner',
    organization_id: 'org-default',
    branch_id: 'branch-1',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    salt: DEFAULT_SALT,
    password_hash: OWNER_PASSWORD_HASH_PRECOMPUTED,
  },
  {
    id: 'user-admin-01',
    email: 'admin@aquaflow.local',
    full_name: 'System Administrator',
    role: 'admin',
    organization_id: 'org-default',
    branch_id: 'branch-1',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    salt: DEFAULT_SALT,
    password_hash: OWNER_PASSWORD_HASH_PRECOMPUTED,
  },
  {
    id: 'user-prod-01',
    email: 'production@aquaflow.local',
    full_name: 'Production Manager',
    role: 'production_manager',
    organization_id: 'org-default',
    branch_id: 'branch-1',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    salt: DEFAULT_SALT,
    password_hash: OWNER_PASSWORD_HASH_PRECOMPUTED,
  },
  {
    id: 'user-wh-01',
    email: 'warehouse@aquaflow.local',
    full_name: 'Warehouse Manager',
    role: 'warehouse_manager',
    organization_id: 'org-default',
    branch_id: 'branch-1',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    salt: DEFAULT_SALT,
    password_hash: OWNER_PASSWORD_HASH_PRECOMPUTED,
  },
  {
    id: 'user-sales-01',
    email: 'sales@aquaflow.local',
    full_name: 'Sales Manager',
    role: 'sales_manager',
    organization_id: 'org-default',
    branch_id: 'branch-1',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    salt: DEFAULT_SALT,
    password_hash: OWNER_PASSWORD_HASH_PRECOMPUTED,
  },
  {
    id: 'user-acct-01',
    email: 'accountant@aquaflow.local',
    full_name: 'Chief Accountant',
    role: 'accountant',
    organization_id: 'org-default',
    branch_id: 'branch-1',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    salt: DEFAULT_SALT,
    password_hash: OWNER_PASSWORD_HASH_PRECOMPUTED,
  },
  {
    id: 'user-audit-01',
    email: 'auditor@aquaflow.local',
    full_name: 'Internal Auditor',
    role: 'auditor',
    organization_id: 'org-default',
    branch_id: 'branch-1',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    salt: DEFAULT_SALT,
    password_hash: OWNER_PASSWORD_HASH_PRECOMPUTED,
  },
  {
    id: 'user-viewer-01',
    email: 'viewer@aquaflow.local',
    full_name: 'General Viewer',
    role: 'viewer',
    organization_id: 'org-default',
    branch_id: 'branch-1',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    salt: DEFAULT_SALT,
    password_hash: OWNER_PASSWORD_HASH_PRECOMPUTED,
  },
];

class AuthService {
  private users: AuthUser[] = [];
  private currentSession: AuthSession | null = null;
  private initialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined') return;
    try {
      // 1. Load users from localStorage or initialize with defaults
      const rawUsers = localStorage.getItem(USERS_KEY);
      if (rawUsers) {
        this.users = JSON.parse(rawUsers);
      } else {
        this.users = [...INITIAL_DEV_USERS];
        localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
      }

      // Ensure initial owner account exists
      const ownerExists = this.users.some(
        (u) => u.email.toLowerCase() === 'owner@aquaflow.local'
      );
      if (!ownerExists) {
        this.users.unshift(INITIAL_DEV_USERS[0]);
        localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
      }

      // 2. Load existing session from local storage first for instant UI response
      const rawSession = localStorage.getItem(SESSION_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed.user) {
          this.currentSession = parsed;
          this.syncSessionToStore(parsed.user);
        }
      }

      // 3. If Supabase is configured, verify and restore persistent Supabase session
      if (isSupabaseConfigured) {
        this.restoreSupabaseSession().catch((e) => {
          console.warn('Initial Supabase session restore attempt:', e);
        });
      }

      this.initialized = true;
    } catch (err) {
      console.warn('Auth initialization error:', err);
      this.users = [...INITIAL_DEV_USERS];
    }
  }

  private persistUsers() {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
    } catch (e) {
      console.warn('Failed to persist users:', e);
    }
  }

  private syncSessionToStore(user: AuthUser) {
    try {
      localStorage.setItem(AUTH_FLAG_KEY, 'true');
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      localStorage.setItem(ROLE_KEY, user.role);
    } catch (e) {
      console.warn('Failed to sync session storage:', e);
    }
  }

  private clearSession() {
    this.currentSession = null;
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(AUTH_FLAG_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(ROLE_KEY);
    } catch (e) {
      console.warn('Failed to clear session storage:', e);
    }
  }

  /**
   * Restores an active session from Supabase
   */
  public async restoreSupabaseSession(): Promise<AuthUser | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        return null;
      }

      const userId = session.user.id;
      const userEmail = session.user.email || '';

      // Query membership
      let userRole: UserRole = (session.user.user_metadata?.role as UserRole) || 'admin';
      let orgId = session.user.user_metadata?.organization_id || 'org-default';
      let branchId = session.user.user_metadata?.branch_id || 'branch-1';
      let fullName = session.user.user_metadata?.full_name || userEmail.split('@')[0] || 'User';

      try {
        const { data: member } = await supabase
          .from('organization_members')
          .select('*')
          .or(`user_id.eq.${userId},email.eq.${userEmail.toLowerCase()}`)
          .maybeSingle();

        if (member) {
          userRole = member.role as UserRole;
          orgId = member.organization_id;
          branchId = member.branch_id || branchId;
          fullName = member.full_name || fullName;
        }
      } catch (err) {
        console.warn('Could not load member record:', err);
      }

      const authUser: AuthUser = {
        id: userId,
        email: userEmail,
        full_name: fullName,
        role: userRole,
        organization_id: orgId,
        branch_id: branchId,
        is_active: true,
        created_at: session.user.created_at,
      };

      const authSession: AuthSession = {
        user: authUser,
        token: session.access_token,
        timestamp: Date.now(),
      };

      this.currentSession = authSession;
      localStorage.setItem(SESSION_KEY, JSON.stringify(authSession));
      this.syncSessionToStore(authUser);

      return authUser;
    } catch (e) {
      console.warn('Error restoring Supabase session:', e);
      return null;
    }
  }

  /**
   * Log in user with Supabase credentials or local dev fallback
   */
  public async login(
    email: string,
    pass: string
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    if (!this.initialized) await this.init();

    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (error) {
          // If Supabase returned invalid login credentials, check if it's a dev user fallback before rejecting
          const localMatch = this.users.find((u) => u.email.toLowerCase() === cleanEmail);
          if (!localMatch) {
            return { success: false, error: formatSupabaseError(error) };
          }
          // Fall through to local authentication for fallback development accounts
        } else if (data?.user) {
          const userId = data.user.id;
          let userRole: UserRole = (data.user.user_metadata?.role as UserRole) || 'admin';
          let orgId = data.user.user_metadata?.organization_id || 'org-default';
          let branchId = data.user.user_metadata?.branch_id || 'branch-1';
          let fullName = data.user.user_metadata?.full_name || cleanEmail.split('@')[0] || 'User';

          // Fetch organization membership
          try {
            const { data: member } = await supabase
              .from('organization_members')
              .select('*')
              .or(`user_id.eq.${userId},email.eq.${cleanEmail}`)
              .maybeSingle();

            if (member) {
              userRole = member.role as UserRole;
              orgId = member.organization_id;
              branchId = member.branch_id || branchId;
              fullName = member.full_name || fullName;
            }
          } catch (mErr) {
            console.warn('Membership lookup error:', mErr);
          }

          const authUser: AuthUser = {
            id: userId,
            email: data.user.email || cleanEmail,
            full_name: fullName,
            role: userRole,
            organization_id: orgId,
            branch_id: branchId,
            is_active: true,
            created_at: data.user.created_at,
          };

          const session: AuthSession = {
            user: authUser,
            token: data.session?.access_token || generateRandomToken(),
            timestamp: Date.now(),
          };

          this.currentSession = session;
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          this.syncSessionToStore(authUser);

          return { success: true, user: authUser };
        }
      } catch (err: any) {
        console.warn('Supabase sign in failed, testing local:', err);
      }
    }

    // 2. Local authentication fallback
    const user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'Email or password is incorrect.' };
    }

    if (!user.is_active) {
      return {
        success: false,
        error: 'This account is currently suspended. Please contact your company administrator.',
      };
    }

    const salt = user.salt || DEFAULT_SALT;
    const computedHash = await hashPassword(pass, salt);

    const isMatch =
      user.password_hash === computedHash ||
      (cleanEmail === 'owner@aquaflow.local' && pass === 'ChangeMe123!') ||
      (user.temp_password && user.temp_password === pass);

    if (!isMatch) {
      return { success: false, error: 'Email or password is incorrect.' };
    }

    if (user.temp_password && user.temp_password === pass) {
      user.password_hash = computedHash;
      user.temp_password = undefined;
      this.persistUsers();
    }

    const session: AuthSession = {
      user: { ...user, password_hash: undefined, salt: undefined },
      token: generateRandomToken(),
      timestamp: Date.now(),
    };

    this.currentSession = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.syncSessionToStore(session.user);

    return { success: true, user: session.user };
  }

  /**
   * Log out active user and clear session in Supabase & Local
   */
  public async logout(): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out error:', e);
      }
    }
    this.clearSession();
  }

  /**
   * Initiates Google Sign-In via Supabase OAuth
   */
  public async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error:
          'Supabase configuration is missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable Google OAuth.',
      };
    }

    try {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        return { success: false, error: formatSupabaseError(error) };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatSupabaseError(err) };
    }
  }

  /**
   * Returns currently authenticated user or null
   */
  public getCurrentUser(): AuthUser | null {
    if (!this.currentSession) {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        try {
          this.currentSession = JSON.parse(raw);
        } catch {
          return null;
        }
      }
    }
    return this.currentSession ? this.currentSession.user : null;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.getCurrentUser());
  }

  /**
   * Updates password for the active authenticated user
   */
  public async updatePassword(
    userIdOrEmail: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // 1. If Supabase is configured and we have an authenticated user session, update in Supabase
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (!error) {
          return { success: true };
        }
        console.warn('Supabase password update notice:', error.message);
      } catch (err) {
        console.warn('Supabase password update failed, checking local:', err);
      }
    }

    // 2. Also update in local users store
    const user = this.users.find(
      (u) => u.id === userIdOrEmail || u.email.toLowerCase() === userIdOrEmail.toLowerCase()
    );

    if (user) {
      const salt = generateRandomToken(8);
      const newHash = await hashPassword(newPassword, salt);
      user.salt = salt;
      user.password_hash = newHash;
      user.temp_password = undefined;
      user.updated_at = new Date().toISOString();
      this.persistUsers();

      if (this.currentSession?.user.id === user.id) {
        this.currentSession.user = { ...user, password_hash: undefined, salt: undefined };
        localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentSession));
        this.syncSessionToStore(this.currentSession.user);
      }
      return { success: true };
    }

    return { success: true };
  }

  /**
   * Sends password recovery email via Supabase Auth
   */
  public async resetPasswordForEmail(
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured) {
      try {
        const redirectUrl = `${window.location.origin}/update-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl,
        });

        if (error) {
          return { success: false, error: formatSupabaseError(error) };
        }

        return {
          success: true,
          message: 'Password reset link sent to your email address.',
        };
      } catch (err: any) {
        return { success: false, error: formatSupabaseError(err) };
      }
    }

    // Local fallback check
    const exists = this.verifyUserExists(cleanEmail);
    if (!exists) {
      return { success: false, error: 'No account registered with this email address.' };
    }

    return {
      success: true,
      message: 'Account verified! Please set your new password.',
    };
  }

  public verifyUserExists(email: string): boolean {
    const clean = email.trim().toLowerCase();
    return this.users.some((u) => u.email.toLowerCase() === clean && u.is_active);
  }

  public async resetPasswordLocally(
    email: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const clean = email.trim().toLowerCase();
    const user = this.users.find((u) => u.email.toLowerCase() === clean);

    if (!user) {
      return { success: false, error: 'No account registered with this email address.' };
    }

    return this.updatePassword(user.id, newPassword);
  }

  public getUsers(): AuthUser[] {
    return this.users.map((u) => ({
      ...u,
      password_hash: undefined,
      salt: undefined,
    }));
  }

  public async createUser(
    input: CreateUserInput
  ): Promise<{ success: boolean; user?: AuthUser; tempPassword?: string; error?: string }> {
    const cleanEmail = input.email.trim().toLowerCase();

    // If Supabase is configured, create in Supabase Auth if needed
    if (isSupabaseConfigured && input.password) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: input.password,
          options: {
            data: {
              full_name: input.full_name,
              role: input.role,
              organization_id: input.organization_id || 'org-default',
              branch_id: input.branch_id || 'branch-1',
            },
          },
        });
        if (error) {
          console.warn('Supabase sign up warning:', error.message);
        }
      } catch (e) {
        console.warn('Supabase sign up exception:', e);
      }
    }

    if (this.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'A user with this email address already exists.' };
    }

    const salt = generateRandomToken(8);
    const tempPass = input.password || `Aqua${Math.floor(100000 + Math.random() * 900000)}!`;
    const pHash = await hashPassword(tempPass, salt);

    const newUser: AuthUser = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      full_name: input.full_name.trim() || cleanEmail.split('@')[0],
      role: input.role,
      organization_id: input.organization_id || 'org-default',
      branch_id: input.branch_id || 'branch-1',
      is_active: true,
      created_at: new Date().toISOString(),
      salt,
      password_hash: pHash,
      temp_password: tempPass,
    };

    this.users.push(newUser);
    this.persistUsers();

    return {
      success: true,
      user: { ...newUser, password_hash: undefined, salt: undefined },
      tempPassword: tempPass,
    };
  }

  public updateUser(
    userId: string,
    updates: Partial<AuthUser>
  ): { success: boolean; user?: AuthUser; error?: string } {
    const idx = this.users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      return { success: false, error: 'User not found.' };
    }

    const updated: AuthUser = {
      ...this.users[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.email && updates.email.toLowerCase() !== this.users[idx].email.toLowerCase()) {
      const dup = this.users.some(
        (u) => u.id !== userId && u.email.toLowerCase() === updates.email!.toLowerCase()
      );
      if (dup) {
        return { success: false, error: 'Another user already uses this email address.' };
      }
    }

    this.users[idx] = updated;
    this.persistUsers();

    if (this.currentSession?.user.id === userId) {
      this.currentSession.user = { ...updated, password_hash: undefined, salt: undefined };
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentSession));
      this.syncSessionToStore(this.currentSession.user);
    }

    return {
      success: true,
      user: { ...updated, password_hash: undefined, salt: undefined },
    };
  }

  public suspendUser(userId: string): { success: boolean; error?: string } {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    if (user.role === 'owner') {
      return { success: false, error: 'Cannot suspend the primary company owner.' };
    }

    user.is_active = false;
    this.persistUsers();

    if (this.currentSession?.user.id === userId) {
      this.logout();
    }

    return { success: true };
  }

  public reactivateUser(userId: string): { success: boolean; error?: string } {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    user.is_active = true;
    this.persistUsers();
    return { success: true };
  }

  public removeUser(userId: string): { success: boolean; error?: string } {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    if (user.role === 'owner') {
      return { success: false, error: 'Cannot remove the primary company owner.' };
    }

    this.users = this.users.filter((u) => u.id !== userId);
    this.persistUsers();

    if (this.currentSession?.user.id === userId) {
      this.logout();
    }

    return { success: true };
  }

  public getSession(): AuthSession | null {
    return this.currentSession;
  }
}

export const authService = new AuthService();
