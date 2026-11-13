import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Play } from 'lucide-react';
import { catalogueOptions } from '@/lib/cinema.queries';
import { headMeta, posters } from '@/lib/cinema';
import { durationLabel } from '@/lib/video-media';
import { youtubeId, youtubeEmbed } from '@/lib/room';
import { t } from '@/lib/i18n';
import { MovieCard } from '@/components/movie-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-context';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/films/$id')({
  loader: async ({ context, params }) => {
    const sessions = await context.queryClient.ensureQueryData(catalogueOptions);
    const movie = sessions.find(s => s.movie_id === params.id)?.movies;
    if (!movie) throw notFound();
    return movie;
  },
  head: ({ loaderData }) => headMeta(loaderData?.title ?? 'Film indisponible', loaderData?.synopsis ?? 'Découvrez les films et leurs séances sur Netfarjou.'),
  component: FilmDetails,
});

function FilmDetails() {
  useTranslation();
  const movie = Route.useLoaderData();
  const { data: sessions } = useSuspenseQuery(catalogueOptions);
  const { user } = useAuth();
  const [trailer, setTrailer] = useState(false);
  const mine = useQuery({ queryKey: ['my-sessions', user?.id], enabled: !!user, queryFn: async () => { const { data, error } = await supabase.from('participants').select('screening_id').eq('user_id', user?.id ?? ''); if (error) throw error; return data; } });
  const trailerId = youtubeId(movie.trailer_url);
  return <main className="standard-page"><section className="film-detail content-width"><Button variant="ghost" asChild><Link to="/seances"><ArrowLeft/>{t('Les séances')}</Link></Button><div className="film-detail-layout"><img className="film-detail-poster" src={posters[movie.poster_url] ?? movie.poster_url} alt={t(movie.title)}/><div className="film-detail-copy"><div className="section-kicker">NETFARJOU</div><h1>{t(movie.title)}</h1><div className="hero-metadata"><span>{movie.year}</span><span>·</span><span>{t(movie.genre)}</span><span>·</span><span>{durationLabel(movie)}</span></div><h2>{t('Synopsis')}</h2><p>{t(movie.synopsis)}</p>{movie.trailer_url && <Button variant="outline" onClick={() => setTrailer(v => !v)}><Play/>{t('Bande-annonce')}</Button>}{trailer && movie.trailer_url && <div className="trailer-frame">{trailerId ? <iframe src={youtubeEmbed(trailerId, 0, false) + '&autoplay=1'} title={`${t('Bande-annonce')} — ${t(movie.title)}`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen/> : <video src={movie.trailer_url} controls autoPlay playsInline/>}</div>}</div></div></section><section className="catalogue-section content-width"><div className="section-heading"><h2>{t('Les séances')}<span className="heading-dot">.</span></h2></div><div className="movie-grid">{sessions.filter(s => s.movie_id === movie.id && s.status !== 'Cancelled').map(session => <MovieCard key={session.id} session={session} registered={mine.data?.some(m => m.screening_id === session.id) ?? false}/>)}</div></section></main>;
}