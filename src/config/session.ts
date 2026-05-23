/**
 * Session Management Configuration
 * Centralized settings for token refresh, validation, and error handling
 */

export const SESSION_CONFIG = {
  // Token refresh interval (5 minutes)
  TOKEN_REFRESH_INTERVAL: 5 * 60 * 1000,

  // Session validation interval (10 minutes)
  SESSION_VALIDATION_INTERVAL: 10 * 60 * 1000,

  // Maximum retries for failed API calls
  MAX_RETRIES: 2,

  // Retry delay in milliseconds (exponential backoff)
  RETRY_DELAY: 1000,

  // Session timeout warning (show warning 5 minutes before expiry)
  SESSION_TIMEOUT_WARNING: 5 * 60 * 1000,

  // Errors that should trigger session clear and redirect to login
  SESSION_ERROR_PATTERNS: [
    'session_not_found',
    'Invalid JWT',
    'AUTHORIZATION_ERROR',
    'authentication required',
    'bearer token',
    'unauthorized',
    'invalid token'
  ],

  // HTTP status codes that should trigger login redirect
  AUTH_ERROR_STATUSES: [401, 403],

  // HTTP status codes that should trigger retry
  RETRYABLE_STATUSES: [408, 429, 500, 502, 503, 504]
};

export const isSessionError = (error: Error | string): boolean => {
  const message = error instanceof Error ? error.message : error;
  return SESSION_CONFIG.SESSION_ERROR_PATTERNS.some(pattern =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
};

export const isRetryableStatus = (status: number): boolean => {
  return SESSION_CONFIG.RETRYABLE_STATUSES.includes(status);
};
