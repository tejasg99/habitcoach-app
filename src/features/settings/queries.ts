/**
 * src/features/settings/queries.ts
 *
 * Query keys and hooks for the account and the profile:
 *   settingsKeys.me       GET /users/me
 *   settingsKeys.profile  GET /onboarding/me
 * The startup gate fills both, so Settings opens with data already there.
 */

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { unwrap } from '@/api/errors';

export const settingsKeys = {
  me: ['me'] as const,
  profile: ['profile'] as const,
};

export const fetchMe = () => unwrap('read_me', apiClient.GET('/users/me'));
export const fetchProfile = () => unwrap('read_my_profile', apiClient.GET('/onboarding/me'));

export type Me = Awaited<ReturnType<typeof fetchMe>>;
export type Profile = Awaited<ReturnType<typeof fetchProfile>>;

export function useMe() {
  return useQuery({ queryKey: settingsKeys.me, queryFn: fetchMe });
}

export function useProfile() {
  return useQuery({ queryKey: settingsKeys.profile, queryFn: fetchProfile });
}
