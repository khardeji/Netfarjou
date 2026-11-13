import { describe, expect, it } from 'vitest';
import { durationLabel, movieSeconds, smallerVideo } from '@/lib/video-media';
import { liveEnded } from '@/lib/room';

describe('durée réelle de la vidéo', () => {
  it('conserve exactement les 38 secondes au lieu des minutes saisies', () => {
    const movie = { duration: 98, duration_seconds: 38 };
    expect(movieSeconds(movie)).toBe(38);
    expect(durationLabel(movie)).toBe('0:38');
    expect(liveEnded('2026-11-12T00:40:00Z', movieSeconds(movie) / 60, Date.parse('2026-11-12T00:40:37Z'))).toBe(false);
    expect(liveEnded('2026-11-12T00:40:00Z', movieSeconds(movie) / 60, Date.parse('2026-11-12T00:40:38Z'))).toBe(true);
  });
  it('utilise les minutes quand aucune vidéo n’a été analysée', () => expect(movieSeconds({ duration: 90 })).toBe(5400));
  it('garde seulement la version qui réduit effectivement la taille', () => {
    const original = new File(['12345'], 'original.mp4');
    const smaller = new File(['12'], 'small.mp4');
    expect(smallerVideo(original, smaller)).toBe(smaller);
    expect(smallerVideo(original, new File(['123456'], 'bigger.mp4'))).toBe(original);
  });
});