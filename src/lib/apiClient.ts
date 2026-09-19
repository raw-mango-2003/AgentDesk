/**
 * AgentDesk Resilient API Client
 * Safely handles API responses, Content-Type validation, JSON parsing,
 * and eliminates the "Unexpected token '<'" error caused by HTML fallbacks.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  message?: string;
  token?: string;
  user?: any;
  tenant?: any;
  mustChangePassword?: boolean;
  onboardingPending?: boolean;
  redirectUrl?: string;
  status?: any;
  httpStatus?: number;
  [key: string]: any;
}

function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/(?:^|;\s*)agentdesk_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    let csrfToken = getCsrfToken();
    const method = (options?.method || 'GET').toUpperCase();

    // If mutating request is made before csrf cookie is populated, proactively retrieve it
    if (!csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && typeof window !== 'undefined' && !url.includes('/api/auth/csrf')) {
      try {
        const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' });
        const csrfJson = await csrfRes.json().catch(() => null);
        if (csrfJson?.csrfToken) {
          csrfToken = csrfJson.csrfToken;
        } else {
          csrfToken = getCsrfToken();
        }
      } catch {}
    }

    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      ...(options?.headers as Record<string, string> || {})
    };
    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      requestHeaders['x-csrf-token'] = csrfToken;
    }

    const res = await fetch(url, {
      ...options,
      credentials: options?.credentials || 'include',
      headers: requestHeaders
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    // 1. Valid JSON response
    if (isJson) {
      try {
        const json = await res.json();
        
        // Normalize error object/string
        let normalizedError: { code: string; message: string } | undefined = undefined;
        if (!res.ok || json.success === false) {
          if (json.error) {
            if (typeof json.error === 'object' && json.error !== null) {
              normalizedError = {
                code: json.error.code || 'API_ERROR',
                message: json.error.message || json.error.code || 'Operation failed.'
              };
            } else {
              normalizedError = {
                code: json.code || 'API_ERROR',
                message: String(json.error)
              };
            }
          } else if (json.message) {
            normalizedError = {
              code: 'API_ERROR',
              message: json.message
            };
          } else {
            normalizedError = {
              code: `HTTP_${res.status}`,
              message: `Server returned status ${res.status}: ${res.statusText}`
            };
          }
        }

        return {
          success: res.ok && json.success !== false,
          ...json,
          error: normalizedError,
          status: res.status
        };
      } catch (parseErr: any) {
        return {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: `Failed to parse server response as JSON: ${parseErr.message}`
          },
          status: res.status
        };
      }
    }

    // 2. Server returned HTML or non-JSON (e.g. 404 fallback, Nginx / Vite error page)
    const rawText = await res.text();
    let friendlyMessage = '';

    if (res.status === 404) {
      friendlyMessage = `API endpoint not found (HTTP 404): ${url}. Ensure the API route is configured correctly on the server.`;
    } else if (res.status === 401 || res.status === 403) {
      friendlyMessage = `Authentication or permission denied (${res.status}).`;
    } else if (res.status >= 500) {
      friendlyMessage = `Internal server error (${res.status}) on ${url}. Please inspect the server logs.`;
    } else {
      friendlyMessage = `Server returned an unexpected non-JSON response (${res.status} ${res.statusText}).`;
    }

    return {
      success: false,
      error: {
        code: `HTTP_NON_JSON_${res.status}`,
        message: friendlyMessage
      },
      status: res.status
    };

  } catch (netErr: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: netErr.message || 'Unable to connect to the AgentDesk API server.'
      },
      status: 0
    };
  }
}
