/**
 * src/features/settings/timezonePrompt.ts
 *
 * When to offer "update your time zone?" (brief: "Timezone drives today").
 *
 * Offer it when the phone's zone differs from the saved one, unless this
 * account already answered (either way) for that same phone zone. Only the
 * LAST answer is kept, so a new zone asks again, and someone who accepts on
 * the way out and on the way home is still asked on their next trip.
 */

import { sameTimeZone } from '@/lib/timezone';

/** The last zone an account answered for. Stored on the device only. */
export type TimezoneAnswer = { userId: number; zone: string };

export type TimezoneOffer = TimezoneAnswer & {
  /** What the server has now. */
  saved: string;
};

/** Read a stored answer; anything unexpected counts as "never answered". */
export function parseTimezoneAnswer(raw: string | null): TimezoneAnswer | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<TimezoneAnswer> | null;
    return typeof data?.userId === 'number' && typeof data.zone === 'string'
      ? { userId: data.userId, zone: data.zone }
      : null;
  } catch {
    return null;
  }
}

export function timezoneOffer(input: {
  userId: number;
  /** null when the phone cannot tell. */
  device: string | null;
  saved: string;
  answered: TimezoneAnswer | null;
}): TimezoneOffer | null {
  const { userId, device, saved, answered } = input;
  if (!device || sameTimeZone(device, saved)) return null;
  if (answered && answered.userId === userId && sameTimeZone(answered.zone, device)) return null;
  return { userId, zone: device, saved };
}

export type TimezoneCheckDeps = {
  device(): string | null;
  me(): Promise<{ id: number }>;
  profile(): Promise<{ timezone: string }>;
  readAnswer(): Promise<string | null>;
};

/** Run the whole check. Any failure means "no prompt this time"; the next app open tries again. */
export async function checkTimezone(deps: TimezoneCheckDeps): Promise<TimezoneOffer | null> {
  try {
    const device = deps.device();
    if (!device) return null;
    const [me, profile, raw] = await Promise.all([deps.me(), deps.profile(), deps.readAnswer()]);
    return timezoneOffer({ userId: me.id, device, saved: profile.timezone, answered: parseTimezoneAnswer(raw) });
  } catch {
    return null;
  }
}

/** Remember that this account answered for this zone (accepted or dismissed). */
export async function rememberTimezoneAnswer(
  { userId, zone }: TimezoneAnswer,
  write: (raw: string) => Promise<void>,
): Promise<void> {
  try {
    await write(JSON.stringify({ userId, zone }));
  } catch {
    // Not saved: the worst case is one more prompt at the next app open.
  }
}
