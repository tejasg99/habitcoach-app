/**
 * src/lib/timezone.ts
 *
 * The device's IANA time zone (brief: Conventions, "use the device's,
 * Intl.DateTimeFormat().resolvedOptions().timeZone"). Onboarding sends it
 * with the profile; Settings (Milestone 7) compares it with the saved one.
 *
 * Falls back to "UTC" (the server's own default) if the runtime cannot tell,
 * so the profile request never carries an empty string.
 */

export function deviceTimeZone(
  resolve: () => string | undefined = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  try {
    const zone = resolve()?.trim();
    return zone ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
}
