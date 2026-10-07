import { Request, Response, NextFunction } from 'express';
import { extractTokenFromRequest, requireAuth } from './authRouter.js';
import { getSession } from './sessionStore.js';
import { getUserById, UserRole } from './userRegistry.js';

export type InternalDepartment =
  | 'PLATFORM'
  | 'UI_UX'
  | 'SECURITY'
  | 'HOSTING'
  | 'INTEGRATIONS'
  | 'BUSINESS';

export const DEPARTMENT_ROLES: Record<Exclude<InternalDepartment, 'PLATFORM'>, UserRole> = {
  UI_UX: 'UI_UX_DESIGNER',
  SECURITY: 'SECURITY_ADMIN',
  HOSTING: 'HOSTING_ADMIN',
  INTEGRATIONS: 'INTEGRATIONS_ADMIN',
  BUSINESS: 'BUSINESS_ADMIN'
};

const ROLE_DEPARTMENTS: Record<string, InternalDepartment> = {
  PLATFORM_ADMIN: 'PLATFORM',
  UI_UX_DESIGNER: 'UI_UX',
  SECURITY_ADMIN: 'SECURITY',
  HOSTING_ADMIN: 'HOSTING',
  INTEGRATIONS_ADMIN: 'INTEGRATIONS',
  BUSINESS_ADMIN: 'BUSINESS'
};

export function getUserDepartment(role?: string | null): InternalDepartment | null {
  return role ? ROLE_DEPARTMENTS[role] || null : null;
}

export function canAccessDepartment(role: string | undefined | null, department: InternalDepartment): boolean {
  if (role === 'PLATFORM_ADMIN') return true;
  return getUserDepartment(role) === department;
}

export function requireDepartment(department: InternalDepartment) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractTokenFromRequest(req);
      const session = await getSession(token);
      const user = session ? getUserById(session.userId) : null;

      if (!user) {
        return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } });
      }

      if (!canAccessDepartment(user.role, department)) {
        return res.status(403).json({ success: false, error: { code: 'DEPARTMENT_FORBIDDEN', message: 'You do not have access to this department.' } });
      }

      (req as any).departmentUser = user;
      return next();
    } catch {
      return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } });
    }
  };
}

export const requirePlatformOrDepartment = requireDepartment;
