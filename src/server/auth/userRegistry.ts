import crypto from 'crypto';
import { hashPassword, verifyPassword } from './passwordUtils.js';
import { logCredentialAction } from './auditRegistry.js';
import { postgresClient } from '../db/postgresClient.js';

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
// PostgreSQL is authoritative; these maps are only a runtime cache.
export const usersByEmailStore = new Map<string, UserRecord>();
export const usersByIdStore = new Map<string, UserRecord>();

let isUsersInitialized = false;

export function initUserRegistry() {
  if (isUsersInitialized) return;
  isUsersInitialized = true;

  // Demo users are opt-in and restricted exclusively to non-production environments.
  // Never seed or expose demo accounts in production.
  if (process.env.ENABLE_DEMO_USERS === 'true' && process.env.NODE_ENV !== 'production') {
    const demoUsers = [
      {
        id: 'usr_summit_admin',
        name: 'David Miller',
        email: 'summit@example.com',
        passwordPlain: process.env.DEMO_SUMMIT_PASSWORD?.trim() || '',
        role: 'BUSINESS_ADMIN' as UserRole,
        tenantId: 'summit-home-services',
        status: 'ACTIVE' as UserStatus,
        mustChangePassword: false,
        emailVerified: true
      },
      {
        id: 'usr_sharma_admin',
        name: 'Dr. Rahul Sharma',
        email: 'sharma@example.com',
        passwordPlain: process.env.DEMO_SHARMA_PASSWORD?.trim() || '',
        role: 'BUSINESS_ADMIN' as UserRole,
        tenantId: 'sharma-dental-care',
        status: 'ACTIVE' as UserStatus,
        mustChangePassword: false,
        emailVerified: true
      },
      {
        id: 'usr_london_admin',
        name: 'Victoria Hastings',
        email: 'london@example.com',
        passwordPlain: process.env.DEMO_LONDON_PASSWORD?.trim() || '',
        role: 'BUSINESS_ADMIN' as UserRole,
        tenantId: 'london-growth-partners',
        status: 'ACTIVE' as UserStatus,
        mustChangePassword: false,
        emailVerified: true
      }
    ];

    for (const demoUser of demoUsers) {
      if (!demoUser.passwordPlain) {
        console.warn(`[UserRegistry] Skipping demo user ${demoUser.email}: required demo password is not configured.`);
        continue;
      }
      seedUser(demoUser);
    }
  }

  // 2. Initial Platform Admin Check and Creation
  bootstrapPlatformAdmin();
}

/**
 * Requirement 1: Check the database for an existing PLATFORM_ADMIN account.
 * If a PLATFORM_ADMIN already exists:
 *   - Do NOT create another one automatically.
 *   - Do NOT overwrite the existing administrator's password.
 *   - Report that the existing platform admin account is already configured.
 * If NO PLATFORM_ADMIN account exists, bootstrap the initial platform administrator:
 *   Email: process.env.PLATFORM_ADMIN_EMAIL (or INITIAL_ADMIN_EMAIL)
 *   Password: process.env.PLATFORM_ADMIN_INITIAL_PASSWORD (strictly required, minimum 8 characters)
 *   Role: PLATFORM_ADMIN
 *   Status: ACTIVE
 *   Password MUST be securely hashed before being stored.
 *   There is NEVER a default or hardcoded administrator credential.
 */
export function bootstrapPlatformAdmin(): { created: boolean; email: string; message: string } {
  // Check the database for an existing PLATFORM_ADMIN account
  const existingAdmins = Array.from(usersByEmailStore.values()).filter(
    (u) => u.role === 'PLATFORM_ADMIN'
  );

  const initialEmail = (
    process.env.PLATFORM_ADMIN_EMAIL ||
    process.env.INITIAL_ADMIN_EMAIL ||
    ''
  ).toLowerCase().trim();

  if (!initialEmail) {
    const errorMsg = '[Auth Bootstrap Error] PLATFORM_ADMIN_EMAIL is not configured. Administrator bootstrap aborted without creating an account with a default email.';
    console.error(errorMsg);
    return {
      created: false,
      email: '',
      message: errorMsg
    };
  }

  // Check if admin account matching target initialEmail or existing PLATFORM_ADMIN exists
  const existingByEmail = getUserByEmail(initialEmail);
  if (existingByEmail && existingByEmail.role === 'PLATFORM_ADMIN') {
    const message = `[Auth Bootstrap] Platform admin account is already configured (${existingByEmail.email}). Did not overwrite administrator password.`;
    console.log(`[Auth Bootstrap] PLATFORM_ADMIN_EMAIL: configured (${existingByEmail.email})`);
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
    return {
      created: false,
      email: primaryAdmin.email,
      message
    };
  }

  const initialPassword = (
    process.env.PLATFORM_ADMIN_INITIAL_PASSWORD ||
    process.env.PLATFORM_ADMIN_PASSWORD ||
    process.env.INITIAL_ADMIN_PASSWORD ||
    ''
  ).trim();

  if (!initialPassword || initialPassword.length < 8) {
    const errorMsg = '[Auth Bootstrap Error] No PLATFORM_ADMIN account exists, and PLATFORM_ADMIN_INITIAL_PASSWORD is not set in environment (minimum 8 characters required). Administrator bootstrap aborted without creating insecure credentials.';
    console.error(errorMsg);
    return {
      created: false,
      email: initialEmail,
      message: errorMsg
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

export async function bootstrapPlatformAdminAsync(): Promise<{ created: boolean; email: string; message: string }> {
  await postgresClient.initialize();

  // Check PostgreSQL first for existing PLATFORM_ADMIN account
  try {
    const res = await postgresClient.query("SELECT * FROM agentdesk_users WHERE role = 'PLATFORM_ADMIN' LIMIT 1");
    if (res?.rows?.length > 0) {
      const dbAdmin = mapDbRowToUserRecord(res.rows[0]);
      usersByEmailStore.set(dbAdmin.email, dbAdmin);
      usersByIdStore.set(dbAdmin.id, dbAdmin);
      const message = `[Auth Bootstrap] Existing platform admin account is already configured in PostgreSQL (${dbAdmin.email}).`;
      console.log(message);
      return { created: false, email: dbAdmin.email, message };
    }
  } catch (err: any) {
    console.warn('[Auth Bootstrap] Error querying PostgreSQL for admin:', err.message);
  }

  const initialEmail = (
    process.env.PLATFORM_ADMIN_EMAIL ||
    process.env.INITIAL_ADMIN_EMAIL ||
    ''
  ).toLowerCase().trim();

  if (!initialEmail) {
    const errorMsg = '[Auth Bootstrap] PLATFORM_ADMIN_EMAIL is not configured in environment. Production admin bootstrap deferred until configured.';
    console.log(errorMsg);
    return { created: false, email: '', message: errorMsg };
  }

  const initialPassword = (
    process.env.PLATFORM_ADMIN_INITIAL_PASSWORD ||
    process.env.PLATFORM_ADMIN_PASSWORD ||
    process.env.INITIAL_ADMIN_PASSWORD ||
    ''
  ).trim();

  if (!initialPassword || initialPassword.length < 8) {
    const errorMsg = '[Auth Bootstrap] PLATFORM_ADMIN_INITIAL_PASSWORD is not set or under 8 chars in environment. Administrator bootstrap deferred.';
    console.log(errorMsg);
    return { created: false, email: initialEmail, message: errorMsg };
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

  await persistUserToPostgres(newAdmin);

  logCredentialAction({
    actorId: 'system',
    actorEmail: 'system@agentdesk',
    actorRole: 'SYSTEM',
    action: 'PLATFORM_ADMIN_BOOTSTRAP',
    targetUserId: newAdmin.id,
    targetUserEmail: newAdmin.email,
    targetTenantId: 'platform',
    metadata: {
      reason: 'Initial platform administrator setup. Bootstrap completed in PostgreSQL.'
    }
  });

  const message = `[Auth Bootstrap] Initial platform administrator account created and persisted in PostgreSQL for ${initialEmail}. Password hashed using crypto scrypt.`;
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

  // Seed/demo initialization is intentionally best-effort; production user
  // mutations use the DB-first async APIs below.
  persistUserToPostgres(record).catch(() => {});
  return record;
}

/**
 * Persist user record to PostgreSQL database (write-through)
 */
export async function persistUserToPostgres(user: UserRecord): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) {
      if (process.env.REQUIRE_PERSISTENT_USERS === 'true') {
        throw new Error('Database persistence unavailable: REQUIRE_PERSISTENT_USERS is enabled but PostgreSQL is not ready.');
      }
      return;
    }

    await postgresClient.query(`
      INSERT INTO agentdesk_users (
        id, name, email, password_hash, role, tenant_id, status, 
        must_change_password, email_verified, reset_token_hash, reset_token_expires,
        verification_token_hash, verification_token_expires, setup_token_hash, setup_token_expires,
        two_factor_enabled, two_factor_phone, failed_login_attempts, lockout_until,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        tenant_id = EXCLUDED.tenant_id,
        status = EXCLUDED.status,
        must_change_password = EXCLUDED.must_change_password,
        email_verified = EXCLUDED.email_verified,
        reset_token_hash = EXCLUDED.reset_token_hash,
        reset_token_expires = EXCLUDED.reset_token_expires,
        verification_token_hash = EXCLUDED.verification_token_hash,
        verification_token_expires = EXCLUDED.verification_token_expires,
        setup_token_hash = EXCLUDED.setup_token_hash,
        setup_token_expires = EXCLUDED.setup_token_expires,
        two_factor_enabled = EXCLUDED.two_factor_enabled,
        two_factor_phone = EXCLUDED.two_factor_phone,
        failed_login_attempts = EXCLUDED.failed_login_attempts,
        lockout_until = EXCLUDED.lockout_until,
        updated_at = EXCLUDED.updated_at
    `, [
      user.id,
      user.name,
      user.email,
      user.passwordHash,
      user.role,
      user.tenantId,
      user.status,
      user.mustChangePassword ?? false,
      user.emailVerified ?? false,
      user.resetTokenHash || null,
      user.resetTokenExpires || null,
      user.verificationTokenHash || null,
      user.verificationTokenExpires || null,
      user.setupTokenHash || null,
      user.setupTokenExpires || null,
      user.twoFactorEnabled ?? false,
      user.twoFactorPhone || null,
      user.failedLoginAttempts || 0,
      user.lockoutUntil || null,
      user.createdAt,
      user.updatedAt
    ]);
  } catch (err: any) {
    console.warn('[UserRegistry:PostgresPersistWarning]', err.message);
    if (process.env.REQUIRE_PERSISTENT_USERS === 'true') throw err;
  }
}

function mapDbRowToUserRecord(row: any): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as UserRole,
    tenantId: row.tenant_id,
    status: row.status as UserStatus,
    mustChangePassword: Boolean(row.must_change_password),
    emailVerified: Boolean(row.email_verified),
    resetTokenHash: row.reset_token_hash || undefined,
    resetTokenExpires: row.reset_token_expires ? Number(row.reset_token_expires) : undefined,
    verificationTokenHash: row.verification_token_hash || undefined,
    verificationTokenExpires: row.verification_token_expires ? Number(row.verification_token_expires) : undefined,
    setupTokenHash: row.setup_token_hash || undefined,
    setupTokenExpires: row.setup_token_expires ? Number(row.setup_token_expires) : undefined,
    twoFactorEnabled: Boolean(row.two_factor_enabled),
    twoFactorPhone: row.two_factor_phone || undefined,
    failedLoginAttempts: row.failed_login_attempts ? Number(row.failed_login_attempts) : 0,
    lockoutUntil: row.lockout_until ? Number(row.lockout_until) : undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

/**
 * Synchronize all users from PostgreSQL into active memory store
 */
export async function syncUsersFromPostgres(): Promise<void> {
  try {
    const isReady = await postgresClient.initialize();
    if (!isReady) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('[UserRegistry] PostgreSQL unavailable; memory cache will not be treated as authoritative.');
      }
      return;
    }

    const res = await postgresClient.query('SELECT * FROM agentdesk_users');
    if (res && res.rows && res.rows.length > 0) {
      for (const row of res.rows) {
        const record = mapDbRowToUserRecord(row);
        usersByEmailStore.set(record.email, record);
        usersByIdStore.set(record.id, record);
      }
      console.log(`[UserRegistry] Synchronized ${res.rows.length} users from PostgreSQL.`);
    } else {
      // Seed all initial in-memory users into PostgreSQL only for an empty DB.
      for (const user of usersByIdStore.values()) {
        await persistUserToPostgres(user);
      }
    }
  } catch (err: any) {
    console.warn('[UserRegistry:PostgresSyncWarning]', err.message);
  }
}

// Auto-initialize memory store & start sync from PostgreSQL
initUserRegistry();
syncUsersFromPostgres().catch(() => {});

/**
 * PostgreSQL Authoritative User Lookup by Email (PostgreSQL -> cache)
 */
export async function getUserByEmailAsync(email: string): Promise<UserRecord | null> {
  if (!email) return null;
  const clean = email.toLowerCase().trim();

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      const res = await postgresClient.query(
        `SELECT * FROM agentdesk_users 
         WHERE LOWER(TRIM(email)) = $1 
         LIMIT 1`,
        [clean]
      );
      if (res && res.rows && res.rows.length > 0) {
        const record = mapDbRowToUserRecord(res.rows[0]);
        usersByEmailStore.set(record.email, record);
        usersByIdStore.set(record.id, record);
        return record;
      }
      // PostgreSQL is authoritative when reachable: a miss is a real miss.
      return null;
    }
  } catch (err: any) {
    console.warn('[UserRegistry:PostgresLookupError]', err.message);
  }

  // Resilient fallback when PostgreSQL is not configured or unavailable
  return getUserByEmail(clean);
}

/**
 * PostgreSQL Authoritative User Lookup by ID (PostgreSQL -> cache)
 */
export async function getUserByIdAsync(id: string): Promise<UserRecord | null> {
  if (!id) return null;
  const cleanId = id.trim();

  try {
    const isReady = await postgresClient.initialize();
    if (isReady) {
      const res = await postgresClient.query(
        'SELECT * FROM agentdesk_users WHERE id = $1 LIMIT 1',
        [cleanId]
      );
      if (res && res.rows && res.rows.length > 0) {
        const record = mapDbRowToUserRecord(res.rows[0]);
        usersByEmailStore.set(record.email, record);
        usersByIdStore.set(record.id, record);
        return record;
      }
      // PostgreSQL is authoritative when reachable: a miss is a real miss.
      return null;
    }
  } catch (err: any) {
    console.warn('[UserRegistry:PostgresLookupError]', err.message);
  }

  // Resilient fallback when PostgreSQL is not configured or unavailable
  return getUserById(cleanId);
}

/**
 * PostgreSQL Authoritative User Creation (fail-closed, DB-first)
 */
export async function createUserAsync(params: {
  name: string;
  email: string;
  passwordPlain: string;
  role?: UserRole;
  tenantId?: string;
  status?: UserStatus;
  mustChangePassword?: boolean;
  emailVerified?: boolean;
}): Promise<UserRecord> {
  const normEmail = params.email.toLowerCase().trim();
  const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const passwordHash = hashPassword(params.passwordPlain);
  const role = params.role || 'BUSINESS_ADMIN';
  const tenantId = (params.tenantId || '').toLowerCase().trim();
  const status = params.status || 'ACTIVE';
  const mustChangePassword = params.mustChangePassword ?? false;
  const emailVerified = params.emailVerified ?? false;

  const record: UserRecord = {
    id,
    name: params.name.trim(),
    email: normEmail,
    passwordHash,
    role,
    tenantId,
    status,
    mustChangePassword,
    emailVerified,
    createdAt: now,
    updatedAt: now
  };

  const isReady = await postgresClient.initialize();
  if (isReady) {
    try {
      await postgresClient.query(`
        INSERT INTO agentdesk_users (
          id, name, email, password_hash, role, tenant_id, status,
          must_change_password, email_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        id, record.name, normEmail, passwordHash, role, tenantId, status,
        mustChangePassword, emailVerified, now, now
      ]);
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('unique')) {
        throw new Error(`An account with email \"${normEmail}\" already exists.`);
      }
      throw new Error(`Database persistence failed: ${err.message}`);
    }
  } else if (process.env.NODE_ENV === 'production' || process.env.REQUIRE_PERSISTENT_USERS === 'true') {
    throw new Error('Database persistence unavailable: Cannot create user without PostgreSQL in production.');
  }

  // Update memory cache only after DB persistence succeeds.
  usersByEmailStore.set(normEmail, record);
  usersByIdStore.set(id, record);
  return record;
}

/**
 * PostgreSQL Authoritative User Update
 */
export async function updateUserAsync(
  id: string,
  updates: Partial<Omit<UserRecord, 'id' | 'email' | 'createdAt'>>
): Promise<UserRecord | null> {
  const cleanId = id.trim();
  const now = new Date().toISOString();

  const isReady = await postgresClient.initialize();
  if (isReady) {
    const existing = await getUserByIdAsync(cleanId);
    if (!existing) return null;

    const merged: UserRecord = { ...existing, ...updates, updatedAt: now };
    await persistUserToPostgres(merged);
    usersByIdStore.set(cleanId, merged);
    usersByEmailStore.set(merged.email, merged);
    return merged;
  }

  if (process.env.REQUIRE_PERSISTENT_USERS === 'true') {
    throw new Error('Database persistence unavailable: Cannot update user without PostgreSQL when REQUIRE_PERSISTENT_USERS is enabled.');
  }

  return updateUser(cleanId, updates);
}

export function getUserByEmail(email: string): UserRecord | null {
  if (!email) return null;
  const clean = email.toLowerCase().trim();
  const user = usersByEmailStore.get(clean);
  if (user) return user;

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
    throw new Error(`An account with email \"${normEmail}\" already exists.`);
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
  persistUserToPostgres(record).catch(() => {});
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
  persistUserToPostgres(updated).catch(() => {});
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
    throw new Error(`The email address \"${cleanEmail}\" is already registered to another account.`);
  }

  usersByEmailStore.delete(user.email);

  const updated: UserRecord = {
    ...user,
    email: cleanEmail,
    updatedAt: new Date().toISOString()
  };

  usersByEmailStore.set(cleanEmail, updated);
  usersByIdStore.set(userId, updated);
  persistUserToPostgres(updated).catch(() => {});
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
  persistUserToPostgres(updated).catch(() => {});
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
  persistUserToPostgres(updated).catch(() => {});
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
  const result = validateVerificationToken(rawToken);
  return result.valid ? (result.user || null) : null;
}

export function validateVerificationToken(rawToken: string): { 
  valid: boolean; 
  reason?: 'missing' | 'invalid' | 'expired'; 
  user?: UserRecord 
} {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, reason: 'missing' };
  }
  const tokenHash = hashToken(rawToken.trim());
  const now = Date.now();

  for (const user of usersByEmailStore.values()) {
    if (user.verificationTokenHash === tokenHash || user.verificationToken === tokenHash || user.verificationToken === rawToken.trim()) {
      if (user.verificationTokenExpires && user.verificationTokenExpires <= now) {
        return { valid: false, reason: 'expired', user };
      }
      return { valid: true, user };
    }
  }

  return { valid: false, reason: 'invalid' };
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
