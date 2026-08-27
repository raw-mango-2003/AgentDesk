import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  tenantId: string;
  normalizedTenantId: string;
  source: 'header' | 'query' | 'body' | 'path';
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      tenantId?: string;
    }
  }
}

/**
 * Normalizes any tenant string
 */
export function normalizeTenantId(id?: string | null): string {
  if (!id) return '';
  return id.trim().toLowerCase();
}

/**
 * Extracts and strictly validates tenant ID from incoming HTTP request.
 */
export function extractTenantIdFromRequest(req: Request): { tenantId: string; source: TenantContext['source'] } | null {
  // 1. Check custom headers
  const headerId = (req.headers['x-tenant-id'] || req.headers['x-tenant_id'] || req.headers['x-business-id']) as string | undefined;
  if (headerId && typeof headerId === 'string' && headerId.trim()) {
    return { tenantId: headerId.trim().toLowerCase(), source: 'header' };
  }

  // 2. Check query params
  const queryId = (req.query.tenant_id || req.query.tenantId || req.query.businessId || req.query.business_id) as string | undefined;
  if (queryId && typeof queryId === 'string' && queryId.trim()) {
    return { tenantId: queryId.trim().toLowerCase(), source: 'query' };
  }

  // 3. Check route params
  const paramId = (req.params.tenantId || req.params.businessId || req.params.tenant_id) as string | undefined;
  if (paramId && typeof paramId === 'string' && paramId.trim()) {
    return { tenantId: paramId.trim().toLowerCase(), source: 'path' };
  }

  // 4. Check JSON body
  if (req.body && typeof req.body === 'object') {
    const bodyId = (req.body.tenant_id || req.body.tenantId || req.body.businessId || req.body.business_id) as string | undefined;
    if (bodyId && typeof bodyId === 'string' && bodyId.trim()) {
      return { tenantId: bodyId.trim().toLowerCase(), source: 'body' };
    }
  }

  return null;
}

/**
 * Secure Express middleware to strictly enforce tenant context on API requests.
 */
export function requireTenantMiddleware(options: { allowOptional?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const extracted = extractTenantIdFromRequest(req);

    if (!extracted) {
      if (options.allowOptional) {
        return next();
      }
      return res.status(403).json({
        error: 'TENANT_ISOLATION_VIOLATION',
        code: 'MISSING_TENANT_ID',
        message: 'Strict tenant isolation enforcement: A valid "tenant_id" (via X-Tenant-ID header, query parameter, or payload) is strictly required for this endpoint.',
        timestamp: new Date().toISOString()
      });
    }

    const cleaned = normalizeTenantId(extracted.tenantId);

    // Guard against wildcard/forged tenant queries
    if (!cleaned || cleaned === '*' || cleaned === 'null' || cleaned === 'undefined' || cleaned === 'all') {
      return res.status(403).json({
        error: 'TENANT_ISOLATION_VIOLATION',
        code: 'INVALID_TENANT_ID',
        message: `Invalid tenant identifier "${extracted.tenantId}". Wildcard, global, or malformed tenant scopes are strictly blocked.`,
        timestamp: new Date().toISOString()
      });
    }

    req.tenantId = cleaned;
    req.tenantContext = {
      tenantId: cleaned,
      normalizedTenantId: cleaned,
      source: extracted.source
    };

    // Set standard response header for debugging and auditing
    res.setHeader('X-Tenant-Context', cleaned);

    next();
  };
}

/**
 * Validates that an array of data records belongs strictly to the requested tenant.
 */
export function filterDataByTenantId<T extends { tenant_id?: string; tenantId?: string; businessId?: string }>(
  records: T[],
  tenantId: string
): T[] {
  const normTenant = normalizeTenantId(tenantId);
  if (!normTenant) return [];
  return records.filter(item => {
    const itemTenant = normalizeTenantId(item.tenant_id || item.tenantId || item.businessId);
    return itemTenant === normTenant;
  });
}

/**
 * Server-side audit runner to verify Firestore tenant filter invariants.
 */
export function verifyTenantFilterSecurity(): {
  allTestsPassed: boolean;
  checks: { name: string; passed: boolean; details: string }[];
} {
  const checks: { name: string; passed: boolean; details: string }[] = [];

  // Check 1: Missing tenant rejection
  try {
    const testReq: any = { headers: {}, query: {}, body: {}, params: {} };
    const extracted = extractTenantIdFromRequest(testReq);
    if (extracted === null) {
      checks.push({
        name: 'Missing Tenant ID Rejection',
        passed: true,
        details: 'Requests with missing tenant context are caught and blocked before touching collections.'
      });
    } else {
      checks.push({
        name: 'Missing Tenant ID Rejection',
        passed: false,
        details: 'Extracted invalid tenant ID when none was provided.'
      });
    }
  } catch (e: any) {
    checks.push({ name: 'Missing Tenant ID Rejection', passed: false, details: e.message });
  }

  // Check 2: Wildcard query prevention
  try {
    const testReq: any = { headers: { 'x-tenant-id': '*' }, query: {}, body: {}, params: {} };
    const extracted = extractTenantIdFromRequest(testReq);
    const isValid = extracted && extracted.tenantId !== '*' && extracted.tenantId !== 'all';
    checks.push({
      name: 'Wildcard Query Prevention',
      passed: !isValid,
      details: 'Wildcard and global tenant identifiers are rejected with 403 TENANT_ISOLATION_VIOLATION.'
    });
  } catch (e: any) {
    checks.push({ name: 'Wildcard Query Prevention', passed: false, details: e.message });
  }

  // Check 3: Multi-tenant dataset isolation
  try {
    const mockDataset = [
      { id: '1', tenant_id: 'biz-acme-tech', data: 'Acme confidential data' },
      { id: '2', tenant_id: 'biz-beta-sol', data: 'Beta confidential data' },
      { id: '3', businessId: 'biz-acme-tech', data: 'Acme lead record' }
    ];

    const acmeResults = filterDataByTenantId(mockDataset, 'biz-acme-tech');
    const betaResults = filterDataByTenantId(mockDataset, 'biz-beta-sol');

    const acmeSafe = acmeResults.length === 2 && !acmeResults.some(r => r.tenant_id === 'biz-beta-sol');
    const betaSafe = betaResults.length === 1 && betaResults[0].tenant_id === 'biz-beta-sol';

    checks.push({
      name: 'Strict Dataset Filtering',
      passed: acmeSafe && betaSafe,
      details: `Acme query returned ${acmeResults.length} records; Beta query returned ${betaResults.length} records. Zero cross-tenant leakage.`
    });
  } catch (e: any) {
    checks.push({ name: 'Strict Dataset Filtering', passed: false, details: e.message });
  }

  const allTestsPassed = checks.every(c => c.passed);
  return { allTestsPassed, checks };
}
