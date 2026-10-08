import posthog from 'posthog-js';

const POSTHOG_KEY = String(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN || '').trim();
const POSTHOG_HOST = String(import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com').trim();

let initialized = false;

export function initPostHog() {
  if (initialized || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: 'history_change',
    autocapture: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage'
  });
  initialized = true;
}

export function captureEvent(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;
  initPostHog();
  posthog.capture(event, properties);
}

export function identifyUser(user: { id: string; email?: string; name?: string; role?: string; tenantId?: string }) {
  if (!POSTHOG_KEY || !user?.id) return;
  initPostHog();
  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
    role: user.role,
    tenant_id: user.tenantId
  });
}

export function resetAnalyticsIdentity() {
  if (!POSTHOG_KEY) return;
  initPostHog();
  posthog.reset();
}
