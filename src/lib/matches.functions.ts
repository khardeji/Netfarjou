import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

export type MatchDayFilter = 'yesterday' | 'today' | 'tomorrow';

export type FootballMatch = {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  competition: {
    name: string;
    emblem?: string | null;
  };
  homeTeam: {
    name: string;
    shortName?: string;
    crest?: string | null;
  };
  awayTeam: {
    name: string;
    shortName?: string;
    crest?: string | null;
  };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
};

function isoDateOffset(daysOffset: number): string {
  const d = new Date(Date.now() + daysOffset * 86_400_000);
  return d.toISOString().slice(0, 10);
}

const STATUS_PRIORITY: Record<string, number> = {
  IN_PLAY: 0,
  PAUSED: 1,
  HALFTIME: 1,
  TIMED: 2,
  SCHEDULED: 3,
  FINISHED: 4,
  POSTPONED: 5,
  CANCELLED: 6,
};

export const getLiveFootballMatches = createServerFn({ method: 'GET' })
  .inputValidator((input) => z.object({ day: z.enum(['yesterday', 'today', 'tomorrow']).default('today') }).parse(input ?? {}))
  .handler(async ({ data }): Promise<{ available: boolean; matches: FootballMatch[]; error?: string }> => {
    const apiKey = process.env['FOOTBALL_DATA_API_KEY']?.trim();
    if (!apiKey) {
      return { available: false, matches: [] };
    }

    const offset = data.day === 'yesterday' ? -1 : data.day === 'tomorrow' ? 1 : 0;
    const dateFrom = isoDateOffset(offset);
    const dateTo = isoDateOffset(offset + 1);
    const url = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-Auth-Token': apiKey,
        },
      });
      if (!response.ok) {
        return {
          available: true,
          matches: [],
          error:
            response.status === 429
              ? 'Limite de requêtes API atteinte. Réessayez dans un instant.'
              : `Erreur API (${response.status})`,
        };
      }
      const json = (await response.json()) as { matches?: FootballMatch[] };
      const matches = (json.matches ?? []).slice().sort((a, b) => {
        const rankA = STATUS_PRIORITY[a.status] ?? 9;
        const rankB = STATUS_PRIORITY[b.status] ?? 9;
        if (rankA !== rankB) return rankA - rankB;
        return Date.parse(a.utcDate) - Date.parse(b.utcDate);
      });
      return { available: true, matches };
    } catch {
      return {
        available: true,
        matches: [],
        error: 'Impossible de contacter football-data.org pour le moment.',
      };
    }
  });

