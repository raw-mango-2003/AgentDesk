import * as Sentry from '@sentry/react';

const dsn = String(import.meta.env.VITE_SENTRY_DSN || '').trim();

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0
  });
}

export function captureClientException(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.withScope(scope => {
    if (context) scope.setContext('agentdesk', context);
    Sentry.captureException(error);
  });
}
