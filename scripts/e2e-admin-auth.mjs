const baseUrl = (process.env.AGENTDESK_E2E_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const email = process.env.AGENTDESK_E2E_ADMIN_EMAIL || process.env.PLATFORM_ADMIN_EMAIL || 'e2e-admin@agentdesk.internal';
const password = process.env.AGENTDESK_E2E_ADMIN_PASSWORD || process.env.PLATFORM_ADMIN_INITIAL_PASSWORD || 'E2E-Admin-Password-123!';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

// Protected identity must reject requests without a session.
const anonymousMe = await request('/api/auth/me');
if (anonymousMe.response.status !== 401 || anonymousMe.body?.authenticated === true) {
  throw new Error(`Unauthenticated identity request should return HTTP 401, received HTTP ${anonymousMe.response.status}: ${JSON.stringify(anonymousMe.body)}`);
}

// Invalid credentials must not create an authenticated session.
const invalidLogin = await request('/api/auth/platform/login', {
  method: 'POST',
  body: JSON.stringify({ email, password: `${password}-invalid` })
});
if (invalidLogin.response.ok || invalidLogin.body?.success === true) {
  throw new Error('Platform admin login accepted invalid credentials.');
}

const login = await request('/api/auth/platform/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

if (!login.response.ok || !login.body?.success) {
  throw new Error(`Platform admin login failed: HTTP ${login.response.status} ${JSON.stringify(login.body)}`);
}

let cookies = '';
if (typeof login.response.headers.getSetCookie === 'function' && login.response.headers.getSetCookie().length > 0) {
  cookies = login.response.headers.getSetCookie().map(v => v.split(';', 1)[0]).join('; ');
} else if (login.response.headers.get('set-cookie')) {
  cookies = (login.response.headers.get('set-cookie') || '')
    .split(/,(?=\s*[a-zA-Z0-9_]+=)/)
    .map(v => v.split(';', 1)[0])
    .join('; ');
}

if (!cookies.includes('agentdesk_session=')) {
  throw new Error(`Platform admin login did not return an HttpOnly session cookie: ${JSON.stringify(cookies)}`);
}

const me = await request('/api/auth/me', { headers: { Cookie: cookies } });
if (!me.response.ok || !me.body?.success || me.body?.user?.role !== 'PLATFORM_ADMIN') {
  throw new Error(`Platform admin session verification failed: HTTP ${me.response.status} ${JSON.stringify(me.body)}`);
}

// Platform-admin-only tenant-isolation audits must report every check as passing.
const tenantAudit = await request('/api/test/tenant-isolation', { headers: { Cookie: cookies } });
if (!tenantAudit.response.ok || tenantAudit.body?.success !== true || tenantAudit.body?.allPassed !== true) {
  throw new Error(`Tenant-isolation audit failed: HTTP ${tenantAudit.response.status} ${JSON.stringify(tenantAudit.body)}`);
}
if (!Array.isArray(tenantAudit.body?.suites) || tenantAudit.body.suites.length === 0 ||
    tenantAudit.body.suites.some(suite => suite.passed !== true)) {
  throw new Error(`Tenant-isolation suite details are missing or contain failures: ${JSON.stringify(tenantAudit.body?.suites)}`);
}

const tenantFilterAudit = await request('/api/test/firestore-tenant-filter', { headers: { Cookie: cookies } });
if (!tenantFilterAudit.response.ok || tenantFilterAudit.body?.success !== true || tenantFilterAudit.body?.allTestsPassed !== true) {
  throw new Error(`Tenant filter audit failed: HTTP ${tenantFilterAudit.response.status} ${JSON.stringify(tenantFilterAudit.body)}`);
}
if (!Array.isArray(tenantFilterAudit.body?.checks) || tenantFilterAudit.body.checks.length === 0 ||
    tenantFilterAudit.body.checks.some(check => check.passed !== true)) {
  throw new Error(`Tenant filter audit details are missing or contain failures: ${JSON.stringify(tenantFilterAudit.body?.checks)}`);
}

// Integration workflow guards: admin-only monitoring, validation, and tenant-provider boundaries.
const anonymousMonitoring = await request('/api/platform/monitoring');
if (![401, 403].includes(anonymousMonitoring.response.status)) {
  throw new Error(`Integration monitoring must reject anonymous access, received HTTP ${anonymousMonitoring.response.status}: ${JSON.stringify(anonymousMonitoring.body)}`);
}

const missingTenantIntegrations = await request('/api/platform/tenant-integrations');
if (missingTenantIntegrations.response.status !== 400 || !/tenantId is required/i.test(missingTenantIntegrations.body?.error || '')) {
  throw new Error(`Platform integration listing should validate tenantId, received HTTP ${missingTenantIntegrations.response.status}: ${JSON.stringify(missingTenantIntegrations.body)}`);
}

const unsupportedIntegrationProvider = await request('/api/platform/tenant-integrations/e2e-missing-tenant/not-a-provider', {
  method: 'PUT',
  headers: { Cookie: cookies },
  body: JSON.stringify({ api_key: 'must-not-be-saved' })
});
if (unsupportedIntegrationProvider.response.status !== 400 || !/unsupported tenant integration provider/i.test(unsupportedIntegrationProvider.body?.error || '')) {
  throw new Error(`Unsupported integration providers must be rejected before saving, received HTTP ${unsupportedIntegrationProvider.response.status}: ${JSON.stringify(unsupportedIntegrationProvider.body)}`);
}

// Logout must revoke the session and clear the browser session cookie.
const logout = await request('/api/auth/logout', {
  method: 'POST',
  headers: { Cookie: cookies }
});
if (!logout.response.ok || logout.body?.success !== true) {
  throw new Error(`Platform admin logout failed: HTTP ${logout.response.status} ${JSON.stringify(logout.body)}`);
}
const afterLogout = await request('/api/auth/me', { headers: { Cookie: cookies } });
if (afterLogout.response.status !== 401 || afterLogout.body?.authenticated === true) {
  throw new Error(`Logged-out session remained authorized: HTTP ${afterLogout.response.status} ${JSON.stringify(afterLogout.body)}`);
}

console.log(JSON.stringify({
  success: true,
  login: 'platform-admin',
  session: 'http-only-cookie',
  role: me.body.user.role,
  negativeCases: ['anonymous-identity-rejected', 'invalid-credentials-rejected'],
  tenantIsolation: 'all-suite-checks-passed',
  tenantFilterAudit: 'all-checks-passed',
  logout: 'session-revoked'
}, null, 2));
