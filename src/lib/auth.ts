import { OrganizationRole, UserRole } from '../types/database';

// ==============================================================================
// STANDALONE LOCAL AUTHENTICATION SERVICE FOR AQUAFLOW ERP
// Completely self-contained: No Supabase, no external APIs, Web Crypto hashing
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
const ORG_KEY = `${STORAGE_PREFIX}current_org`;

/**
 * Web Crypto API Password Hasher
 * Uses SHA-256 with a unique salt to securely hash passwords in the browser.
 */
export async function hashPassword(password: string, salt: string = 'aquaflow_salt_2026'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}:aquaflow_secure`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a secure random salt or token
 */
export function generateRandomToken(length = 16): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Default development accounts
const DEFAULT_SALT = 'aquaflow_salt_default';
// SHA-256 of "ChangeMe123!" with default salt
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

class StandaloneAuthService {
  private users: AuthUser[] = [];
  private currentSession: AuthSession | null = null;
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
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

      // 2. Load existing session
      const rawSession = localStorage.getItem(SESSION_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        // Verify user still exists and is active
        const user = this.users.find((u) => u.id === parsed.user?.id);
        if (user && user.is_active) {
          this.currentSession = {
            user,
            token: parsed.token || generateRandomToken(),
            timestamp: parsed.timestamp || Date.now(),
          };
          this.syncSessionToStore(user);
        } else {
          this.clearSession();
        }
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
   * Log in user with local credentials
   */
  public async login(
    email: string,
    pass: string
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    if (!this.initialized) this.init();

    const cleanEmail = email.trim().toLowerCase();
    const user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (!user.is_active) {
      return {
        success: false,
        error: 'This account is currently suspended. Please contact your company administrator.',
      };
    }

    // Verify password hash
    const salt = user.salt || DEFAULT_SALT;
    const computedHash = await hashPassword(pass, salt);

    const isMatch =
      user.password_hash === computedHash ||
      // Dev backdoor fallback for initial owner password if salt or hash reset
      (cleanEmail === 'owner@aquaflow.local' && pass === 'ChangeMe123!') ||
      // Temp password match if assigned during invite/creation
      (user.temp_password && user.temp_password === pass);

    if (!isMatch) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // If logged in via temp password, hash it permanently
    if (user.temp_password && user.temp_password === pass) {
      user.password_hash = computedHash;
      user.temp_password = undefined;
      this.persistUsers();
    }

    // Create session
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
   * Log out active user and clear session
   */
  public logout(): void {
    this.clearSession();
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

  /**
   * Returns boolean status
   */
  public isAuthenticated(): boolean {
    return Boolean(this.getCurrentUser());
  }

  /**
   * Updates password for a given user or current user
   */
  public async updatePassword(
    userIdOrEmail: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const user = this.users.find(
      (u) => u.id === userIdOrEmail || u.email.toLowerCase() === userIdOrEmail.toLowerCase()
    );

    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    const salt = generateRandomToken(8);
    const newHash = await hashPassword(newPassword, salt);

    user.salt = salt;
    user.password_hash = newHash;
    user.temp_password = undefined;
    user.updated_at = new Date().toISOString();

    this.persistUsers();

    // If current session is this user, update session
    if (this.currentSession?.user.id === user.id) {
      this.currentSession.user = { ...user, password_hash: undefined, salt: undefined };
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentSession));
      this.syncSessionToStore(this.currentSession.user);
    }

    return { success: true };
  }

  /**
   * Verifies if an email exists locally for password recovery
   */
  public verifyUserExists(email: string): boolean {
    const clean = email.trim().toLowerCase();
    return this.users.some((u) => u.email.toLowerCase() === clean && u.is_active);
  }

  /**
   * Reset password locally for forgot password recovery flow
   */
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

  /**
   * Get all local users
   */
  public getUsers(): AuthUser[] {
    return this.users.map((u) => ({
      ...u,
      password_hash: undefined,
      salt: undefined,
    }));
  }

  /**
   * Create a new team user locally
   */
  public async createUser(
    input: CreateUserInput
  ): Promise<{ success: boolean; user?: AuthUser; tempPassword?: string; error?: string }> {
    const cleanEmail = input.email.trim().toLowerCase();

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

  /**
   * Update user details
   */
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

    // If updating email, check duplicate
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

  /**
   * Suspend user
   */
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

  /**
   * Reactivate user
   */
  public reactivateUser(userId: string): { success: boolean; error?: string } {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    user.is_active = true;
    this.persistUsers();
    return { success: true };
  }

  /**
   * Remove user
   */
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

export const authService = new StandaloneAuthService();
