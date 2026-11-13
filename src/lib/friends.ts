import { z } from 'zod';

export const friendCodeSchema = z.string().trim().toUpperCase().regex(/^NF-[A-F0-9]{32}$/, 'Identifiant invalide');
export const friendResponseSchema = z.object({ id: z.string().uuid(), accept: z.boolean() });
export function canInviteFriend(self: string, peer: string, state: string) {
  return self !== peer && state === 'accepted';
}
export function canHearCall(state: string, ended: boolean) {
  return state === 'joined' && !ended;
}