/**
 * When the "update your time zone?" prompt appears, and when it stays away.
 */

import {
  checkTimezone,
  parseTimezoneAnswer,
  rememberTimezoneAnswer,
  timezoneOffer,
  type TimezoneCheckDeps,
} from '@/features/settings/timezonePrompt';
import { detectDeviceTimeZone, deviceTimeZone, sameTimeZone } from '@/lib/timezone';

const base = { userId: 1, device: 'Asia/Tokyo', saved: 'Europe/London', answered: null };

describe('timezoneOffer', () => {
  it('offers the phone zone when it differs from the saved one', () => {
    expect(timezoneOffer(base)).toEqual({ userId: 1, zone: 'Asia/Tokyo', saved: 'Europe/London' });
  });

  it('stays quiet when they match, or differ only by an old name', () => {
    expect(timezoneOffer({ ...base, device: 'Europe/London' })).toBeNull();
    expect(timezoneOffer({ ...base, device: 'Asia/Calcutta', saved: 'Asia/Kolkata' })).toBeNull();
  });

  it('stays quiet when the phone cannot tell', () => {
    expect(timezoneOffer({ ...base, device: null })).toBeNull();
  });

  it('does not ask again for a zone this account already answered', () => {
    expect(timezoneOffer({ ...base, answered: { userId: 1, zone: 'Asia/Tokyo' } })).toBeNull();
  });

  it('asks again for a new zone, or for another account', () => {
    expect(timezoneOffer({ ...base, answered: { userId: 1, zone: 'Europe/Paris' } })).not.toBeNull();
    expect(timezoneOffer({ ...base, answered: { userId: 2, zone: 'Asia/Tokyo' } })).not.toBeNull();
  });

  it('asks on the way home after accepting on the way out', () => {
    const answered = { userId: 1, zone: 'Asia/Tokyo' };
    expect(timezoneOffer({ userId: 1, device: 'Europe/London', saved: 'Asia/Tokyo', answered })).not.toBeNull();
  });
});

describe('checkTimezone', () => {
  function deps(overrides: Partial<TimezoneCheckDeps> = {}): TimezoneCheckDeps {
    return {
      device: () => 'Asia/Tokyo',
      me: async () => ({ id: 1 }),
      profile: async () => ({ timezone: 'Europe/London' }),
      readAnswer: async () => null,
      ...overrides,
    };
  }

  it('prompts once: a remembered answer silences the next open', async () => {
    const stored: { raw: string | null } = { raw: null };
    const d = deps({ readAnswer: async () => stored.raw });
    const offer = await checkTimezone(d);
    expect(offer).not.toBeNull();
    await rememberTimezoneAnswer(offer!, async (raw) => {
      stored.raw = raw;
    });
    // Only the account id and the zone are kept.
    expect(JSON.parse(stored.raw!)).toEqual({ userId: 1, zone: 'Asia/Tokyo' });
    expect(await checkTimezone(d)).toBeNull();
  });

  it('never throws: a failed read means no prompt', async () => {
    expect(await checkTimezone(deps({ profile: async () => Promise.reject(new Error('offline')) }))).toBeNull();
    expect(await checkTimezone(deps({ readAnswer: async () => Promise.reject(new Error('locked')) }))).toBeNull();
  });

  it('a failed write is swallowed', async () => {
    await expect(
      rememberTimezoneAnswer({ userId: 1, zone: 'UTC' }, async () => Promise.reject(new Error('full'))),
    ).resolves.toBeUndefined();
  });
});

describe('helpers', () => {
  it('junk in storage counts as never answered', () => {
    for (const raw of [null, '', 'nope', 'null', '{}', '{"userId":"1","zone":"UTC"}']) {
      expect(parseTimezoneAnswer(raw)).toBeNull();
    }
  });

  it('detectDeviceTimeZone says null where deviceTimeZone falls back to UTC', () => {
    expect(detectDeviceTimeZone(() => undefined)).toBeNull();
    expect(
      detectDeviceTimeZone(() => {
        throw new Error('no Intl');
      }),
    ).toBeNull();
    expect(deviceTimeZone(() => undefined)).toBe('UTC');
    expect(detectDeviceTimeZone(() => ' Asia/Tokyo ')).toBe('Asia/Tokyo');
  });

  it('sameTimeZone knows renamed zones', () => {
    expect(sameTimeZone('Etc/UTC', 'UTC')).toBe(true);
    expect(sameTimeZone('Europe/Paris', 'Europe/London')).toBe(false);
  });
});
