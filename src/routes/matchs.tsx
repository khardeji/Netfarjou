import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Play, Radio, Trophy } from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import { FootballScoreboard } from '@/components/football-scoreboard';
import { MovieCard } from '@/components/movie-card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, headMeta, isMatchGenre } from '@/lib/cinema';
import { catalogueOptions } from '@/lib/cinema.queries';
import { t } from '@/lib/i18n';
import { liveEnded } from '@/lib/room';
import { movieSeconds } from '@/lib/video-media';

export const Route = createFileRoute('/matchs')({
  head: () =>
    headMeta(
      'Matchs en direct',
      'Suivez les matchs en direct avec vos amis et la communauté sur Netfarjou.',
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogueOptions),
  component: MatchesPage,
});

function MatchesPage() {
  useTranslation();
  const { data: sessions } = useSuspenseQuery(catalogueOptions);
  const { user, admin } = useAuth();
  const cache = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');

  const mine = useQuery({
    queryKey: ['my-sessions', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('screening_id')
        .eq('user_id', user?.id ?? '');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`matchs-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'screenings' }, () =>
        cache.invalidateQueries({ queryKey: ['catalogue'] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => {
        cache.invalidateQueries({ queryKey: ['catalogue'] });
        cache.invalidateQueries({ queryKey: ['my-sessions'] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cache]);

  const matches = sessions
    .filter((s) => isMatchGenre(s.movies?.genre) && s.status !== 'Cancelled')
    .sort((a, b) => {
      const rank = (status: string) =>
        status === 'Live' ? 0 : status === 'Waiting Room' ? 1 : status === 'Registration Open' ? 2 : status === 'Upcoming' ? 3 : 4;
      return rank(a.status) - rank(b.status);
    });

  const liveMatch = matches.find(
    (s) => s.status === 'Live' && !liveEnded(s.starts_at, movieSeconds(s.movies) / 60, Date.now()),
  );

  const filtered = matches.filter((s) => {
    if (filter === 'live') return s.status === 'Live';
    if (filter === 'upcoming') return ['Upcoming', 'Registration Open', 'Waiting Room'].includes(s.status);
    if (filter === 'finished') return s.status === 'Finished';
    return true;
  });

  return (
    <main className="standard-page content-width">
      <div className="page-heading">
        <div className="section-kicker">
          <Radio size={13} className="inline mr-1.5 text-primary" />
          {t('SPORT & DIRECT')}
        </div>
        <h1>
          {t('Matchs en direct')}
          <span className="heading-dot">.</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t('Vivez les grands matchs ensemble, en direct et en appel vocal avec vos amis.')}
        </p>
      </div>

      {liveMatch && (
        <section className="live-match-banner" aria-label={t('Match en direct')}>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="live-dot" />
              {t('En direct maintenant')}
            </span>
            <h2 className="text-2xl font-bold">{liveMatch.movies?.title}</h2>
            <p className="text-sm text-muted-foreground">
              {liveMatch.movies?.synopsis || formatDate(liveMatch.starts_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user ? (
              <Button asChild>
                <Link to="/salle/$id" params={{ id: liveMatch.id }}>
                  <Play size={16} />
                  {t('Regarder le match')}
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/auth">
                  <Play size={16} />
                  {t('Se connecter pour regarder')}
                </Link>
              </Button>
            )}
          </div>
        </section>
      )}

      <div className="catalogue-toolbar mt-6">
        <div className="filter-tabs">
          {[
            { id: 'all', label: 'Tous les matchs' },
            { id: 'live', label: 'En direct' },
            { id: 'upcoming', label: 'À venir' },
            { id: 'finished', label: 'Terminés' },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              className={filter === tab.id ? 'filter-active' : ''}
              onClick={() => setFilter(tab.id as typeof filter)}
            >
              {tab.id === 'live' && <Radio size={14} />}
              {t(tab.label)}
            </Button>
          ))}
        </div>
        {admin && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">{t('Gérer les matchs')}</Link>
          </Button>
        )}
      </div>

      <div className="movie-grid">
        {filtered.map((session) => (
          <MovieCard
            key={session.id}
            session={session}
            registered={mine.data?.some((m) => m.screening_id === session.id) ?? false}
          />
        ))}
      </div>

      {!filtered.length && (
        <div className="empty-state">
          <Trophy size={32} className="text-muted-foreground" />
          <h3>{t('Aucun match programmé pour le moment')}</h3>
          <p>{t('Les prochains matchs en direct apparaîtront ici dès que l’administration les aura programmés.')}</p>
          {filter !== 'all' && (
            <Button variant="link" onClick={() => setFilter('all')}>
              {t('Voir tous les matchs')}
            </Button>
          )}
        </div>
      )}

      <section className="mt-10" aria-label={t('Calendrier des matchs en direct')}>
        <h2 className="text-xl font-semibold mb-4">{t('Calendrier & scores en direct')}</h2>
        <FootballScoreboard sessions={sessions} />
      </section>
    </main>
  );
}

