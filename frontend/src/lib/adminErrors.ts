import { ApiError } from './api';

/** Turns anything thrown by an admin API call into a short, user-presentable message. */
export function getAdminErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "You don't have permission to do that.";
    if (err.status === 401) return 'Your session has ended. Please log in again.';
    if (err.status === 404) return err.message && err.message !== 'Not Found' ? err.message : 'That record could not be found.';
    if (err.status === 409) return err.message || 'This conflicts with an existing record.';
    if (err.status >= 500) return 'The server ran into a problem. Please try again in a moment.';
    return err.message || 'The request could not be completed.';
  }
  if (err instanceof TypeError) return 'Network error - check your connection and try again.';
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}
