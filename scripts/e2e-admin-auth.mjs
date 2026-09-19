const baseUrl = (process.env.AGENTDESK_E2E_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const email = process.env.AGENTDESK_E2E_ADMIN_EMAIL || 'e2e-admin@agentdesk.internal';
const password = process.env.AGENTDESK_E2E_ADMIN_PASSWORD || 'E2E-Admin-Password-123!';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

const login = await request('/api/auth/platform/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

if (!login.response.ok || !login.body?.success) {
  throw new Error(`Platform admin login failed: HTTP ${login.response.status} ${JSON.stringify(login.body)}`);
}

const setCookies = typeof login.response.headers.getSetCookie === 'function'
  ? login.response.headers.getSetCookie()
  : [];
const cookies = setCookies.map(v => v.split(';', 1)[0]).join('; ');
if (!cookies.includes('agentdesk_session=')) {
  throw new Error(`Platform admin login did not return an HttpOnly session cookie: ${JSON.stringify(setCookies)}`);
}

const me = await request('/api/auth/me', { headers: { Cookie: cookies } });
if (!me.response.ok || !me.body?.success || me.body?.user?.role !== 'PLATFORM_ADMIN') {
  throw new Error(`Platform admin session verification failed: HTTP ${me.response.status} ${JSON.stringify(me.body)}`);
}

console.log(JSON.stringify({
  success: true,
  login: 'platform-admin',
  session: 'http-only-cookie',
  role: me.body.user.role
}, null, 2));
