import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Play, Plus, RefreshCw, Shield, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-context';
import { isMatchGenre } from '@/lib/cinema';
import { t } from '@/lib/i18n';
import type { FootballMatch, MatchDayFilter } from '@/lib/matches.functions';
import { footballMatchesOptions } from '@/lib/matches.queries';

type MatchScreeningLink = {
  id: string;
  status: string;
  movies: { genre: string; title: string } | null;
};

function formatMatchTime(utcDate: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(utcDate));
}

function matchStatusInfo(status: string, minute?: number | null) {
  switch (status) {
    case 'IN_PLAY':
      return { label: minute ? `${minute}'` : t('En direct'), live: true };
    case 'PAUSED':
    case 'HALFTIME':
      return { label: t('Mi-temps'), live: true };
    case 'FINISHED':
      return { label: t('Terminé'), live: false };
    case 'POSTPONED':
      return { label: t('Reporté'), live: false };
    case 'CANCELLED':
      return { label: t('Annulé'), live: false };
    default:
      return { label: t('À venir'), live: false };
  }
}

function findMatchingScreening(match: FootballMatch, sessions: MatchScreeningLink[]): MatchScreeningLink | undefined {
  const home = (match.homeTeam.shortName || match.homeTeam.name).toLowerCase();
  const away = (match.awayTeam.shortName || match.awayTeam.name).toLowerCase();
  return sessions.find((s) => {
    if (!isMatchGenre(s.movies?.genre) || s.status === 'Cancelled') return false;
    const title = (s.movies?.title ?? '').toLowerCase();
    return title.includes(home) && title.includes(away);
  });
}

export function FootballScoreboard({
  sessions = [],
  compact = false,
  onCreateRoom,
}: {
  sessions?: MatchScreeningLink[];
  compact?: boolean;
  onCreateRoom?: (match: FootballMatch) => void;
}) {
  useTranslation();
  const { user } = useAuth();
  const [day, setDay] = useState<MatchDayFilter>('today');
  const query = useQuery(footballMatchesOptions(day));

  if (query.data && !query.data.available) return null;

  const matches = query.data?.matches ?? [];
  const displayed = compact ? matches.slice(0, 6) : matches;

  return (
    <div className="scoreboard-wrap">
      <div className="scoreboard-toolbar">
        <div className="filter-tabs">
          {[
            { id: 'yesterday', label: 'Hier' },
            { id: 'today', label: 'Aujourd’hui' },
            { id: 'tomorrow', label: 'Demain' },
          ].map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={day === item.id ? 'filter-active' : ''}
              onClick={() => setDay(item.id as MatchDayFilter)}
            >
              {t(item.label)}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} />
          {t('Actualiser')}
        </Button>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground py-6">{t('Chargement des matchs…')}</p>
      ) : query.data?.error ? (
        <p className="text-sm text-muted-foreground py-6">{query.data.error}</p>
      ) : !displayed.length ? (
        <div className="empty-state py-8">
          <Trophy size={26} className="text-muted-foreground" />
          <p>{t('Aucun match prévu pour cette journée.')}</p>
        </div>
      ) : (
        <div className="scoreboard-list">
          {displayed.map((m) => {
            const info = matchStatusInfo(m.status, m.minute);
            const hasScore =
              m.score.fullTime.home !== null && m.score.fullTime.away !== null;
            const linked = findMatchingScreening(m, sessions);

            return (
              <article className="scoreboard-row" key={m.id}>
                <div className="scoreboard-teams">
                  <div className="scoreboard-team scoreboard-team-home">
                    <span>{m.homeTeam.shortName || m.homeTeam.name}</span>
                    {m.homeTeam.crest ? (
                      <img src={m.homeTeam.crest} alt="" loading="lazy" />
                    ) : (
                      <Shield size={20} className="text-muted-foreground shrink-0" />
                    )}
                  </div>

                  <div className="scoreboard-center">
                    <strong className="scoreboard-score">
                      {hasScore
                        ? `${m.score.fullTime.home} - ${m.score.fullTime.away}`
                        : formatMatchTime(m.utcDate)}
                    </strong>
                    <span className={info.live ? 'scoreboard-pill scoreboard-pill-live' : 'scoreboard-pill'}>
                      {info.live && <span className="live-dot" />}
                      {info.label}
                    </span>
                  </div>

                  <div className="scoreboard-team scoreboard-team-away">
                    {m.awayTeam.crest ? (
                      <img src={m.awayTeam.crest} alt="" loading="lazy" />
                    ) : (
                      <Shield size={20} className="text-muted-foreground shrink-0" />
                    )}
                    <span>{m.awayTeam.shortName || m.awayTeam.name}</span>
                  </div>
                </div>

                <div className="scoreboard-meta">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    {m.competition.emblem && (
                      <img src={m.competition.emblem} alt="" className="h-4 w-4 object-contain" loading="lazy" />
                    )}
                    {m.competition.name}
                  </span>

                  {linked && ['Live', 'Waiting Room'].includes(linked.status) && (
                    <Button size="sm" asChild>
                      <Link to={user ? '/salle/$id' : '/auth'} params={{ id: linked.id }}>
                        <Play size={13} />
                        {user ? t('Regarder') : t('Se connecter')}
                      </Link>
                    </Button>
                  )}

                  {onCreateRoom && !linked && (
                    <Button size="sm" variant="outline" onClick={() => onCreateRoom(m)}>
                      <Plus size={13} />
                      {t('Créer salle')}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
