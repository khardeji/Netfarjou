import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

export type MatchDayFilter = 'yesterday' | 'today' | 'tomorrow' | 'week';

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

type AllSportsFixture = {
  event_key: number;
  event_date: string;
  event_time: string;
  event_home_team: string;
  event_away_team: string;
  event_final_result?: string;
  event_status?: string;
  event_live?: string;
  country_name?: string;
  league_name?: string;
  league_logo?: string | null;
  home_team_logo?: string | null;
  away_team_logo?: string | null;
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

function parseAllSportsScore(raw?: string): { home: number | null; away: number | null } {
  if (!raw || !raw.includes('-')) return { home: null, away: null };
  const parts = raw.split('-').map((s) => s.trim());
  const home = parts[0] !== '' && !Number.isNaN(Number(parts[0])) ? Number(parts[0]) : null;
  const away = parts[1] !== '' && !Number.isNaN(Number(parts[1])) ? Number(parts[1]) : null;
  return { home, away };
}

function mapAllSportsFixture(f: AllSportsFixture): FootballMatch {
  const rawStatus = (f.event_status ?? '').trim();
  const numericMinute = /^\d+\+?$/.test(rawStatus) ? Number.parseInt(rawStatus, 10) : null;
  const isLive = f.event_live === '1' || numericMinute !== null;

  let status = 'TIMED';
  if (rawStatus.toLowerCase() === 'finished' || rawStatus === 'After ET' || rawStatus === 'After Pen.') {
    status = 'FINISHED';
  } else if (rawStatus.toLowerCase() === 'half time' || rawStatus.toLowerCase() === 'halftime') {
    status = 'HALFTIME';
  } else if (rawStatus.toLowerCase() === 'postponed') {
    status = 'POSTPONED';
  } else if (rawStatus.toLowerCase() === 'cancelled' || rawStatus.toLowerCase() === 'abandoned') {
    status = 'CANCELLED';
  } else if (isLive) {
    status = 'IN_PLAY';
  }

  const timePart = f.event_time && /^\d{2}:\d{2}$/.test(f.event_time) ? f.event_time : '00:00';
  const utcDate = `${f.event_date}T${timePart}:00Z`;
  const competitionName = [f.country_name, f.league_name].filter(Boolean).join(' · ') || 'Football';

  return {
    id: 1_000_000_000 + f.event_key,
    utcDate,
    status,
    minute: numericMinute,
    competition: {
      name: competitionName,
      emblem: f.league_logo ?? null,
    },
    homeTeam: {
      name: f.event_home_team,
      shortName: f.event_home_team,
      crest: f.home_team_logo ?? null,
    },
    awayTeam: {
      name: f.event_away_team,
      shortName: f.event_away_team,
      crest: f.away_team_logo ?? null,
    },
    score: {
      fullTime: parseAllSportsScore(f.event_final_result),
    },
  };
}

async function fetchFootballData(apiKey: string, day: MatchDayFilter): Promise<FootballMatch[]> {
  const dateFrom =
    day === 'yesterday'
      ? isoDateOffset(-1)
      : day === 'tomorrow'
        ? isoDateOffset(1)
        : isoDateOffset(0);
  const dateTo =
    day === 'yesterday'
      ? isoDateOffset(0)
      : day === 'tomorrow'
        ? isoDateOffset(2)
        : day === 'week'
          ? isoDateOffset(10)
          : isoDateOffset(1);
  const res = await fetch(`https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
    headers: { 'X-Auth-Token': apiKey },
  });
  if (!res.ok) throw new Error(`football-data.org (${res.status})`);
  const json = (await res.json()) as { matches?: FootballMatch[] };
  return json.matches ?? [];
}

async function fetchAllSports(apiKey: string, day: MatchDayFilter): Promise<FootballMatch[]> {
  const dateFrom =
    day === 'yesterday'
      ? isoDateOffset(-1)
      : day === 'tomorrow'
        ? isoDateOffset(1)
        : isoDateOffset(0);
  const dateTo =
    day === 'yesterday'
      ? isoDateOffset(-1)
      : day === 'tomorrow'
        ? isoDateOffset(1)
        : day === 'week'
          ? isoDateOffset(7)
          : isoDateOffset(0);
  const url = `https://apiv2.allsportsapi.com/football/?met=Fixtures&APIkey=${encodeURIComponent(apiKey)}&from=${dateFrom}&to=${dateTo}&timezone=UTC`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`allsportsapi (${res.status})`);
  const json = (await res.json()) as { success?: number; result?: AllSportsFixture[] };
  return (json.result ?? []).map(mapAllSportsFixture);
}

function normalizeTeamKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
}

export const getLiveFootballMatches = createServerFn({ method: 'GET' })
  .inputValidator((input) => z.object({ day: z.enum(['yesterday', 'today', 'tomorrow', 'week']).default('today') }).parse(input ?? {}))
  .handler(async ({ data }): Promise<{ available: boolean; matches: FootballMatch[]; error?: string }> => {
    const footballDataKey = process.env['FOOTBALL_DATA_API_KEY']?.trim();
    const allSportsKey = process.env['ALLSPORTS_API_KEY']?.trim();
    if (!footballDataKey && !allSportsKey) {
      return { available: false, matches: [] };
    }

    const tasks: Array<Promise<FootballMatch[]>> = [];
    if (footballDataKey) tasks.push(fetchFootballData(footballDataKey, data.day));
    if (allSportsKey) tasks.push(fetchAllSports(allSportsKey, data.day));

    const results = await Promise.allSettled(tasks);
    const merged: FootballMatch[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const m of result.value) {
        const key = `${m.utcDate.slice(0, 10)}:${normalizeTeamKey(m.homeTeam.shortName || m.homeTeam.name)}:${normalizeTeamKey(m.awayTeam.shortName || m.awayTeam.name)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(m);
      }
    }

    if (!merged.length && results.every((r) => r.status === 'rejected')) {
      return {
        available: true,
        matches: [],
        error: 'Impossible de récupérer les matchs pour le moment.',
      };
    }

    merged.sort((a, b) => {
      const rankA = STATUS_PRIORITY[a.status] ?? 9;
      const rankB = STATUS_PRIORITY[b.status] ?? 9;
      if (rankA !== rankB) return rankA - rankB;
      return Date.parse(a.utcDate) - Date.parse(b.utcDate);
    });

    return { available: true, matches: merged };
  });
