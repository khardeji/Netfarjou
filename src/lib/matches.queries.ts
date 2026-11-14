import { queryOptions } from '@tanstack/react-query';
import { getLiveFootballMatches, type MatchDayFilter } from './matches.functions';

export const footballMatchesOptions = (day: MatchDayFilter = 'today') =>
  queryOptions({
    queryKey: ['football-matches', day],
    queryFn: () => getLiveFootballMatches({ data: { day } }),
    staleTime: 45_000,
    refetchInterval: 60_000,
  });
