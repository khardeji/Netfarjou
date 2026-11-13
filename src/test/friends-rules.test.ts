import { describe, expect, it } from 'vitest';
import { friendCodeSchema, canInviteFriend, canHearCall } from '@/lib/friends';
describe('amis et appels privés', () => {
  it('accepte un identifiant unique complet sans tenir compte de la casse', () => {
    expect(friendCodeSchema.parse(' nf-0123456789abcdef0123456789abcdef ')).toBe('NF-0123456789ABCDEF0123456789ABCDEF');
    expect(friendCodeSchema.safeParse('NF-012').success).toBe(false);
  });
  it('interdit les appels vers soi-même et les demandes non acceptées', () => {
    expect(canInviteFriend('alice', 'alice', 'accepted')).toBe(false);
    expect(canInviteFriend('alice', 'bob', 'pending')).toBe(false);
    expect(canInviteFriend('alice', 'bob', 'accepted')).toBe(true);
  });
  it('seuls les invités ayant rejoint un appel actif peuvent entendre', () => {
    expect(canHearCall('invited', false)).toBe(false);
    expect(canHearCall('declined', false)).toBe(false);
    expect(canHearCall('left', false)).toBe(false);
    expect(canHearCall('joined', true)).toBe(false);
    expect(canHearCall('joined', false)).toBe(true);
  });
});