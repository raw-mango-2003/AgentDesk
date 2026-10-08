import * as Sentry from '@sentry/node';

const dsn = String(process.env.SENTRY_DSN || '').trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    sendDefaultPii: false,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1)
  });
}

export function captureServerException(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.withScope(scope => {
    if (context) scope.setContext('agentdesk', context);
    Sentry.captureException(error);
  });
}

export async function flushServerTelemetry(timeoutMs = 2000) {
  if (!dsn) return;
  await Sentry.flush(timeoutMs);
}
