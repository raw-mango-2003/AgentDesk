import crypto from 'crypto';
import { hashPassword, verifyPassword } from './passwordUtils.js';
import { logCredentialAction } from './auditRegistry.js';

export type UserRole = 'PLATFORM_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_USER';
export type UserStatus = 'PENDING' | 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  tenantId: string;
  status: UserStatus;
  mustChangePassword?: boolean;
  emailVerified: boolean;
  resetToken?: string;
  resetTokenHash?: string;
  resetTokenExpires?: number;
  verificationToken?: string;
  verificationTokenHash?: string;
  verificationTokenExpires?: number;
  setupTokenHash?: string;
  setupTokenExpires?: number;
  twoFactorEnabled?: boolean;
  twoFactorPhone?: string;
  failedLoginAttempts?: number;
  lockoutUntil?: number;
  deletionRequestedAt?: string;
  deletionScheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

// In-Memory User Store (Email -> UserRecord)
export const usersByEmailStore = new Map<string, UserRecord>();
export const usersByIdStore = new Map<string, UserRecord>();

let isUsersInitialized = false;

export function initUserRegistry() {
  if (isUsersInitialized) return;
  isUsersInitialized = true;

  // 1. Demo Customer Business Admins
  seedUser({
    id: 'usr_summit_admin',
    name: 'David Miller',
    email: 'summit@example.com',
    passwordPlain: 'Summit2026!',
    role: 'BUSINESS_ADMIN',
    tenantId: 'summit-home-services',
    status: 'ACTIVE',
    mustChangePassword: false,
    emailVerified: true
  });

  seedUser({
    id: 'usr_sharma_admin',
    name: 'Dr. Rahul Sharma',
    email: 'sharma@example.com',
    passwordPlain: 'Sharma2026!',
    role: 'BUSINESS_ADMIN',
    tenantId: 'sharma-dental-care',
    status: 'ACTIVE',
    mustChangePassword: false,
    emailVerified: true
  });

  seedUser({
    id: 'usr_london_admin',
    name: 'Victoria Hastings',
    email: 'london@example.com',
    passwordPlain: 'London2026!',
    role: 'BUSINESS_ADMIN',
    tenantId: 'london-growth-partners',
    status: 'ACTIVE',
    mustChangePassword: false,
    emailVerified: true
  });

  // 2. Initial Platform Admin Check and Creation
  bootstrapPlatformAdmin();
}

/**
 * Requirement 1: Check the database for an existing PLATFORM_ADMIN account.
 * If a PLATFORM_ADMIN already exists:
 *   - Do NOT create another one automatically.
 *   - Do NOT overwrite the existing administrator's password.
 *   - Report that the existing platform admin account is already configured.
 * If NO PLATFORM_ADMIN account exists, create the initial platform administrator:
 *   Email / Username: admin@agentdesk (or process.env.INITIAL_ADMIN_EMAIL)
 *   Password: Admin@2613 (or process.env.INITIAL_ADMIN_PASSWORD)
 *   Role: PLATFORM_ADMIN
 *   Status: ACTIVE
 *   Password MUST be securely hashed before being stored.
 */
export function bootstrapPlatformAdmin(): { created: boolean; email: string; message: string } {
  // Check the database for an existing PLATFORM_ADMIN account
  const existingAdmins = Array.from(usersByEmailStore.values()).filter(
    (u) => u.role === 'PLATFORM_ADMIN'
  );

  const initialEmail = (
    process.env.PLATFORM_ADMIN_EMAIL ||
    process.env.INITIAL_ADMIN_EMAIL ||
    'admin@agentdesk'
  ).toLowerCase().trim();
  const initialPassword =
    process.env.PLATFORM_ADMIN_INITIAL_PASSWORD ||
    process.env.INITIAL_ADMIN_PASSWORD ||
    'Admin@2613';

  // Check if admin account matching target initialEmail or existing PLATFORM_ADMIN exists
  const existingByEmail = getUserByEmail(initialEmail);
  if (existingByEmail && existingByEmail.role === 'PLATFORM_ADMIN') {
    const message = `[Auth Bootstrap] Platform admin account is already configured (${existingByEmail.email}). Did not overwrite administrator password.`;
    console.log(`[Auth Bootstrap] PLATFORM_ADMIN_EMAIL: configured (${existingByEmail.email})`);
    console.log(`[Auth Bootstrap] PLATFORM_ADMIN_INITIAL_PASSWORD: configured`);
    return {
      created: false,
      email: existingByEmail.email,
      message
    };
  }

  if (existingAdmins.length > 0) {
    const primaryAdmin = existingAdmins[0];
    const message = `[Auth Bootstrap] Existing platform admin account is already configured (${primaryAdmin.email}). Did not create duplicate or overwrite administrator password.`;
    console.log(`[Auth Bootstrap] PLATFORM_ADMIN_EMAIL: configured (${primaryAdmin.email})`);
    console.log(`[Auth Bootstrap] PLATFORM_ADMIN_INITIAL_PASSWORD: configured`);
    return {
      created: false,
      email: primaryAdmin.email,
      message
    };
  }

  const newAdmin = seedUser({
    id: 'usr_platform_admin_root',
    name: 'Platform Administrator',
    email: initialEmail,
    passwordPlain: initialPassword,
    role: 'PLATFORM_ADMIN',
    tenantId: 'platform',
    status: 'ACTIVE',
    mustChangePassword: false,
    emailVerified: true
  });

  logCredentialAction({
    actorId: 'system',
    actorEmail: 'system@agentdesk',
    actorRole: 'SYSTEM',
    action: 'PLATFORM_ADMIN_BOOTSTRAP',
    targetUserId: newAdmin.id,
    targetUserEmail: newAdmin.email,
    targetTenantId: 'platform',
    metadata: {
      reason: 'Initial platform administrator setup. Bootstrap completed.'
    }
  });

  console.log(`[Auth Bootstrap] PLATFORM_ADMIN_EMAIL: configured (${initialEmail})`);
  console.log(`[Auth Bootstrap] PLATFORM_ADMIN_INITIAL_PASSWORD: configured`);
  const message = `[Auth Bootstrap] Initial platform administrator account created for ${initialEmail}. Password hashed using crypto scrypt.`;
  console.log(message);
  return {
    created: true,
    email: initialEmail,
    message
  };
}

export function seedUser(params: {
  id: string;
  name: string;
  email: string;
  passwordPlain: string;
  role: UserRole;
  tenantId: string;
  status: UserStatus;
  mustChangePassword?: boolean;
  emailVerified: boolean;
}): UserRecord {
  const normEmail = params.email.toLowerCase().trim();
  const record: UserRecord = {
    id: params.id,
    name: params.name,
    email: normEmail,
    passwordHash: hashPassword(params.passwordPlain),
    role: params.role,
    tenantId: params.tenantId.toLowerCase().trim(),
    status: params.status,
    mustChangePassword: params.mustChangePassword ?? false,
    emailVerified: params.emailVerified,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  usersByEmailStore.set(normEmail, record);
  usersByIdStore.set(params.id, record);
  return record;
}

// Auto-initialize
initUserRegistry();

export function getUserByEmail(email: string): UserRecord | null {
  if (!email) return null;
  const clean = email.toLowerCase().trim();
  const user = usersByEmailStore.get(clean);
  if (user) return user;

  // Convenience normalization: if someone types 'admin@agentdesk.ai' or 'admin@agentdesk'
  if (clean === 'admin@agentdesk.ai' || clean === 'admin@agentdesk') {
    const admin = Array.from(usersByEmailStore.values()).find(u => u.role === 'PLATFORM_ADMIN');
    if (admin) return admin;
  }

  return null;
}

export function getUserById(id: string): UserRecord | null {
  if (!id) return null;
  return usersByIdStore.get(id.trim()) || null;
}

export function getAllUsers(): UserRecord[] {
  return Array.from(usersByIdStore.values());
}

export function getUsersByTenantId(tenantId: string): UserRecord[] {
  const clean = tenantId.toLowerCase().trim();
  return Array.from(usersByIdStore.values()).filter(
    (u) => u.tenantId === clean
  );
}

export function createUser(params: {
  name: string;
  email: string;
  passwordPlain: string;
  role?: UserRole;
  tenantId?: string;
  status?: UserStatus;
  mustChangePassword?: boolean;
  emailVerified?: boolean;
}): UserRecord {
  const normEmail = params.email.toLowerCase().trim();
  if (usersByEmailStore.has(normEmail)) {
    throw new Error(`An account with email "${normEmail}" already exists.`);
  }

  const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const record: UserRecord = {
    id,
    name: params.name.trim(),
    email: normEmail,
    passwordHash: hashPassword(params.passwordPlain),
    role: params.role || 'BUSINESS_ADMIN',
    tenantId: (params.tenantId || '').toLowerCase().trim(),
    status: params.status || 'ACTIVE',
    mustChangePassword: params.mustChangePassword ?? false,
    emailVerified: params.emailVerified ?? false,
    createdAt: now,
    updatedAt: now
  };

  usersByEmailStore.set(normEmail, record);
  usersByIdStore.set(id, record);
  return record;
}

export function updateUser(id: string, updates: Partial<Omit<UserRecord, 'id' | 'email' | 'createdAt'>>): UserRecord | null {
  const user = usersByIdStore.get(id);
  if (!user) return null;

  const updated: UserRecord = {
    ...user,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  usersByIdStore.set(id, updated);
  usersByEmailStore.set(user.email, updated);
  return updated;
}

export function updateUserEmail(userId: string, newEmail: string): UserRecord {
  const user = usersByIdStore.get(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  const cleanEmail = newEmail.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('Please provide a valid email address.');
  }

  if (cleanEmail !== user.email && usersByEmailStore.has(cleanEmail)) {
    throw new Error(`The email address "${cleanEmail}" is already registered to another account.`);
  }

  usersByEmailStore.delete(user.email);

  const updated: UserRecord = {
    ...user,
    email: cleanEmail,
    updatedAt: new Date().toISOString()
  };

  usersByEmailStore.set(cleanEmail, updated);
  usersByIdStore.set(userId, updated);
  return updated;
}

export function updateUserPassword(
  userId: string, 
  newPasswordPlain: string, 
  mustChangePassword: boolean = false
): UserRecord {
  const user = usersByIdStore.get(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  if (newPasswordPlain.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const updated: UserRecord = {
    ...user,
    passwordHash: hashPassword(newPasswordPlain),
    mustChangePassword,
    resetToken: undefined,
    resetTokenExpires: undefined,
    updatedAt: new Date().toISOString()
  };

  usersByIdStore.set(userId, updated);
  usersByEmailStore.set(user.email, updated);
  return updated;
}

export function updateUserStatus(userId: string, status: UserStatus): UserRecord {
  const user = usersByIdStore.get(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  const updated: UserRecord = {
    ...user,
    status,
    updatedAt: new Date().toISOString()
  };

  usersByIdStore.set(userId, updated);
  usersByEmailStore.set(user.email, updated);
  return updated;
}

export function updateUserTenantAndRole(userId: string, tenantId: string, role: UserRole, status: UserStatus = 'ACTIVE'): UserRecord | null {
  return updateUser(userId, {
    tenantId: tenantId.toLowerCase().trim(),
    role,
    status
  });
}

export function createPasswordResetToken(userId: string): string {
  const user = usersByIdStore.get(userId);
  if (!user) throw new Error('User not found.');

  // Cryptographically secure 32-byte raw token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const oneHourExpires = Date.now() + 60 * 60 * 1000;

  updateUser(userId, {
    resetTokenHash: tokenHash,
    resetToken: tokenHash, // keep legacy field in sync with hash
    resetTokenExpires: oneHourExpires
  });

  return rawToken;
}

export function findUserByResetToken(rawToken: string): UserRecord | null {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const now = Date.now();

  for (const user of usersByEmailStore.values()) {
    if (
      user.resetTokenExpires &&
      user.resetTokenExpires > now &&
      (user.resetTokenHash === tokenHash || user.resetToken === tokenHash || user.resetToken === rawToken)
    ) {
      return user;
    }
  }
  return null;
}

export function createEmailVerificationToken(userId: string): string {
  const user = usersByIdStore.get(userId);
  if (!user) throw new Error('User not found.');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const twentyFourHoursExpires = Date.now() + 24 * 60 * 60 * 1000;

  updateUser(userId, {
    verificationTokenHash: tokenHash,
    verificationToken: tokenHash,
    verificationTokenExpires: twentyFourHoursExpires
  });

  return rawToken;
}

export function findUserByVerificationToken(rawToken: string): UserRecord | null {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const now = Date.now();

  for (const user of usersByEmailStore.values()) {
    if (
      user.verificationTokenExpires &&
      user.verificationTokenExpires > now &&
      (user.verificationTokenHash === tokenHash || user.verificationToken === tokenHash || user.verificationToken === rawToken)
    ) {
      return user;
    }
  }
  return null;
}

export function createAccountSetupToken(userId: string): string {
  const user = usersByIdStore.get(userId);
  if (!user) throw new Error('User not found.');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const sevenDaysExpires = Date.now() + 7 * 24 * 60 * 60 * 1000;

  updateUser(userId, {
    setupTokenHash: tokenHash,
    setupTokenExpires: sevenDaysExpires
  });

  return rawToken;
}

export function findUserBySetupToken(rawToken: string): UserRecord | null {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const now = Date.now();

  for (const user of usersByEmailStore.values()) {
    if (
      user.setupTokenExpires &&
      user.setupTokenExpires > now &&
      user.setupTokenHash === tokenHash
    ) {
      return user;
    }
  }
  return null;
}

