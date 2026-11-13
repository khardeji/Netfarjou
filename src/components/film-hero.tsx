import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play, CalendarDays, Users } from 'lucide-react';
import { Button } from './ui/button';
import { t } from '@/lib/i18n';
import { formatDate, posters } from '@/lib/cinema';
import { durationLabel } from '@/lib/video-media';
import type { Screening } from '@/lib/cinema.queries';
import horizon from '@/assets/horizon.jpg';

export function FilmHero({ sessions }: { sessions: Screening[] }) {
  useTranslation();
  const films = sessions.filter((s, index, all) => s.movies && s.status !== 'Cancelled' && all.findIndex(other => other.movie_id === s.movie_id) === index);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (paused || focused || films.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % films.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, focused, films.length]);
  const featured = films[index % Math.max(1, films.length)];
  const movie = featured?.movies;
  const image = movie?.poster_url === 'horizon' ? horizon : movie ? posters[movie.poster_url] ?? movie.poster_url : horizon;
  function move(direction: number) { setIndex(i => (i + direction + films.length) % films.length); }
  return <section className="cinema-hero" aria-roledescription="carousel" aria-label={t('À L’AFFICHE')} onMouseEnter={() => setFocused(true)} onMouseLeave={() => setFocused(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <img key={image} className="hero-image" src={image} alt={movie ? t(movie.title) : 'Netfarjou'} fetchPriority="high" />
    <div className="hero-shade" />
    <div className="hero-content content-width">
      <div className="hero-eyebrow"><span>{t('À L’AFFICHE')}</span>NETFARJOU</div>
      <h1>{t(movie?.title ?? 'Netfarjou')}</h1>
      {movie && <div className="hero-metadata"><span>{movie.year}</span><span>·</span><span>{t(movie.genre)}</span><span>·</span><span>{durationLabel(movie)}</span></div>}
      <p className="hero-description">{t(movie?.synopsis ?? 'Retrouvez bientôt notre prochaine programmation.')}</p>
      {featured && <div className="hero-session"><span><CalendarDays size={16}/>{formatDate(featured.starts_at)}</span><span><Users size={16}/>{featured.participant_count} {t('spectateurs')}</span></div>}
      <div className="hero-buttons">{movie ? <><Button asChild><Link to="/films/$id" params={{ id: movie.id }}><Play fill="currentColor"/>{t('Découvrir le film')}</Link></Button><Button variant="outline" asChild><Link to="/films/$id" params={{ id: movie.id }}>{t('Les séances')}<ArrowUpRight/></Link></Button></> : <Button asChild><Link to="/seances">{t('Les séances')}<ArrowRight/></Link></Button>}</div>
    </div>
    {films.length > 1 && <div className="film-carousel-controls"><Button size="icon" variant="secondary" aria-label={t('Précédent')} title={t('Précédent')} onClick={() => move(-1)}><ArrowLeft/></Button><span>{String(index % films.length + 1).padStart(2, '0')} / {String(films.length).padStart(2, '0')}</span><Button size="icon" variant="secondary" aria-label={t('Suivant')} title={t('Suivant')} onClick={() => move(1)}><ArrowRight/></Button><Button size="icon" variant="ghost" aria-label={paused ? t('Lecture') : t('Pause')} title={paused ? t('Lecture') : t('Pause')} onClick={() => setPaused(v => !v)}>{paused ? <Play/> : <Pause/>}</Button></div>}
  </section>;
}