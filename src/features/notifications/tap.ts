/**
 * src/features/notifications/tap.ts
 *
 * Where a tapped notification leads. The payload comes from outside the app,
 * so anything that is not a known screen is ignored.
 */

/** Reads `data.screen` from the notification's data. */
export function screenFromData(data: unknown): 'today' | null {
  if (typeof data !== 'object' || data === null) return null;
  return (data as { screen?: unknown }).screen === 'today' ? 'today' : null;
}
