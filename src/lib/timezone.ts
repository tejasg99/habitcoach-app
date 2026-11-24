/**
 * src/lib/timezone.ts
 *
 * The device's IANA time zone (brief: Conventions, "use the device's,
 * Intl.DateTimeFormat().resolvedOptions().timeZone"). Onboarding sends it
 * with the profile; Settings (Milestone 7) compares it with the saved one.
 *
 * `deviceTimeZone` falls back to "UTC" (the server's own default) if the runtime cannot tell,
 * so the profile request never carries an empty string. `detectDeviceTimeZone`
 * says null instead: the "update your time zone?" prompt must not offer UTC
 * just because the phone could not tell.
 */

type ResolveZone = () => string | undefined;
const resolveFromIntl: ResolveZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** The device's IANA zone, or null if the runtime cannot tell. */
export function detectDeviceTimeZone(resolve: ResolveZone = resolveFromIntl): string | null {
  try {
    return resolve()?.trim() || null;
  } catch {
    return null;
  }
}

export function deviceTimeZone(resolve: ResolveZone = resolveFromIntl): string {
  return detectDeviceTimeZone(resolve) ?? 'UTC';
}

/**
 * Old IANA names some phones still report, with the current name of the SAME
 * zone. Without this, a person in India whose profile says "Asia/Kolkata"
 * would be asked to "move" to "Asia/Calcutta".
 */
const ZONE_ALIASES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon',
  'Europe/Kiev': 'Europe/Kyiv',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'Etc/UTC': 'UTC',
  'Etc/GMT': 'UTC',
  GMT: 'UTC',
};

/** True when both names mean the same zone. */
export function sameTimeZone(a: string, b: string): boolean {
  return (ZONE_ALIASES[a] ?? a) === (ZONE_ALIASES[b] ?? b);
}
