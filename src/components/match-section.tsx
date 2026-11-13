import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CalendarDays, Play, Radio, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import { MovieCard } from '@/components/movie-card';
import { Button } from '@/components/ui/button';
import { formatDate, isMatchGenre } from '@/lib/cinema';
import type { Screening } from '@/lib/cinema.queries';
import { t } from '@/lib/i18n';
import { liveEnded, minutesSinceStart } from '@/lib/room';
import { movieSeconds } from '@/lib/video-media';

export function MatchSection({
  sessions,
  registeredIds = [],
  compact = false,
}: {
  sessions: Screening[];
  registeredIds?: string[];
  compact?: boolean;
}) {
  useTranslation();
  const { user } = useAuth();

  const matches = sessions
    .filter((s) => isMatchGenre(s.movies?.genre) && s.status !== 'Cancelled')
    .sort((a, b) => {
      const rank = (status: string) =>
        status === 'Live'
          ? 0
          : status === 'Waiting Room'
            ? 1
            : status === 'Registration Open'
              ? 2
              : status === 'Upcoming'
                ? 3
                : 4;
      return rank(a.status) - rank(b.status);
    });

  if (compact && !matches.length) return null;

  const liveMatch = matches.find(
    (s) => s.status === 'Live' && !liveEnded(s.starts_at, movieSeconds(s.movies) / 60, Date.now()),
  );
  const displayed = compact ? matches.slice(0, 4) : matches;

  return (
    <section className="match-showcase content-width" aria-label={t('Matchs en direct')}>
      <div className="section-heading">
        <div>
          <div className="section-kicker">
            <Trophy size={13} className="inline mr-1.5 text-primary" />
            {t('SPORT & DIRECT')}
          </div>
          <h2>
            {t('Matchs en direct')}
            <span className="heading-dot">.</span>
          </h2>
          <p>{t('Vivez les grands matchs ensemble, en direct et en appel vocal avec vos amis.')}</p>
        </div>
        {compact && (
          <Button variant="ghost" asChild>
            <Link to="/matchs">
              {t('Voir tous les matchs')}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>

      {liveMatch && (
        <div className="live-match-banner" role="region" aria-label={t('Match en direct')}>
          <div className="space-y-2.5 min-w-0 flex-[1_1_260px]">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wider">
              <span className="inline-flex items-center gap-2 text-primary">
                <span className="live-dot" />
                {t('En direct maintenant')}
              </span>
              <span className="text-muted-foreground font-normal">
                · {minutesSinceStart(liveMatch.starts_at, Date.now())} {t('min')}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground font-normal">
                <Users size={13} />
                {liveMatch.participant_count}
              </span>
            </div>
            <h3 className="text-xl sm:text-3xl font-bold tracking-tight break-words">
              {liveMatch.movies?.title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {liveMatch.movies?.synopsis || formatDate(liveMatch.starts_at)}
            </p>
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays size={13} />
              {formatDate(liveMatch.starts_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {user ? (
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/salle/$id" params={{ id: liveMatch.id }}>
                  <Play size={16} />
                  {t('Regarder le match')}
                </Link>
              </Button>
            ) : (
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/auth">
                  <Radio size={16} />
                  {t('Se connecter pour regarder')}
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {displayed.length > 0 && (
        <div className="movie-grid mt-6">
          {displayed.map((session) => (
            <MovieCard
              key={session.id}
              session={session}
              registered={registeredIds.includes(session.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

