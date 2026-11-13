import { describe, it, expect } from 'vitest';
import { playbackTarget, roomIsOpen } from '@/lib/room';
describe('projection synchronisée', () => {
  const state = { is_playing: true, playback_position: 20, playback_updated_at: '2026-11-11T22:00:00Z', status: 'Live' };
  it('rattrape la position courante pour une arrivée en cours de film', () => expect(playbackTarget(state, Date.parse('2026-11-11T22:00:10Z'))).toBe(30));
  it('conserve la position pendant une pause', () => expect(playbackTarget({ ...state, is_playing: false }, Date.parse('2026-11-11T22:00:10Z'))).toBe(20));
  it('ne lance pas le film dans le salon d’attente', () => expect(playbackTarget({ ...state, status: 'Waiting Room' }, Date.parse('2026-11-11T22:00:10Z'))).toBe(20));
  it('borne la position à la fin du média', () => expect(playbackTarget(state, Date.parse('2026-11-11T22:00:10Z'), 25)).toBe(25));
  it('ouvre uniquement les salons et séances en direct', () => {
    expect(roomIsOpen('Waiting Room')).toBe(true); expect(roomIsOpen('Live')).toBe(true);
    for (const status of ['Upcoming','Registration Open','Finished','Cancelled']) expect(roomIsOpen(status)).toBe(false);
  });
});import { liveOffset, youtubeId } from '@/lib/room';
describe('direct calé sur l’horaire', () => {
  it('un spectateur arrivé à 00:50 pour une séance de 00:40 démarre à 10 minutes', () => expect(liveOffset('2026-11-12T00:40:00Z', Date.parse('2026-11-12T00:50:00Z'))).toBe(600));
  it('avant le début, la position reste à 0', () => expect(liveOffset('2026-11-12T00:40:00Z', Date.parse('2026-11-12T00:30:00Z'))).toBe(0));
  it('reconnaît les liens YouTube', () => { expect(youtubeId('https://www.youtube.com/watch?v=zQol7cvg_uI')).toBe('zQol7cvg_uI'); expect(youtubeId('https://youtu.be/zQol7cvg_uI')).toBe('zQol7cvg_uI'); expect(youtubeId('https://x.com/a.mp4')).toBeNull(); });
});
import { liveEnded, minutesSinceStart } from '@/lib/room';
describe('fin de séance', () => {
  it('un film de 90 min commencé à 00:40 est terminé à 02:10', () => { expect(liveEnded('2026-11-12T00:40:00Z', 90, Date.parse('2026-11-12T02:10:00Z'))).toBe(true); expect(liveEnded('2026-11-12T00:40:00Z', 90, Date.parse('2026-11-12T02:09:00Z'))).toBe(false); });
  it('arrivé à 00:55 pour 00:40 : commencé depuis 15 min', () => expect(minutesSinceStart('2026-11-12T00:40:00Z', Date.parse('2026-11-12T00:55:00Z'))).toBe(15));
});
