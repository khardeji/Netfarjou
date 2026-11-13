import { durationLabel, movieSeconds } from '@/lib/video-media';
import { t } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { CalendarDays, Clock3, Users, ArrowUpRight, Check, Play } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { cancelScreeningRegistration, registerForScreening } from '@/lib/cinema.functions';
import { canRegister, formatDate, posters, statusLabel } from '@/lib/cinema';
import { liveEnded, minutesSinceStart, roomIsOpen, youtubeEmbed, youtubeId } from '@/lib/room';
import type { Screening } from '@/lib/cinema.queries';
import { useAuth } from './auth-context';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
export function MovieCard({ session, registered = false }: {
    session: Screening;
    registered?: boolean;
}) {
 useTranslation();
    const movie = session.movies;
    const { user } = useAuth();
    const cache = useQueryClient();
    const register = useServerFn(registerForScreening);
    const cancel = useServerFn(cancelScreeningRegistration);
    const [busy, setBusy] = useState(false);
    const [details, setDetails] = useState(false);
    const [trailer, setTrailer] = useState(false);
    if (!movie)
        return null;
    const isLive = session.status === 'Live' && !liveEnded(session.starts_at, movieSeconds(movie) / 60, Date.now());
    const liveNote = isLive ? <p className="live-note"><span className="live-dot" />{t("Le film a commenc\u00E9 il y a")} {minutesSinceStart(session.starts_at, Date.now()) < 1 ? `${Math.max(0, Math.floor((Date.now() - Date.parse(session.starts_at)) / 1000))} s` : `${minutesSinceStart(session.starts_at, Date.now())} ${t("min")}`}{user ? '' : ` · ${t("Connectez-vous d\u2019abord pour entrer")}`}</p> : null;
    const open = canRegister(session.status, session.registration_opens_at, session.registration_closes_at, session.participant_count, session.capacity);
    const trailerId = youtubeId(movie?.trailer_url);
    const roomLink = (isLive && user) || (registered && session.status === 'Waiting Room') ? <Button asChild size="sm"><Link to="/salle/$id" params={{ id: session.id }}><Play />{t("Entrer dans la salle")}</Link></Button>  : isLive && !user ? <Button asChild size="sm"><Link to="/auth"><Play />{t("Se connecter")}</Link></Button> : null;
    async function join() {
        setBusy(true);
        try {
            await register({ data: { screeningId: session.id } });
            toast.success(t("Votre place est réservée. Vous recevrez un e-mail de rappel lorsque la séance va commencer !"));
            cache.invalidateQueries({ queryKey: ['catalogue'] });
            cache.invalidateQueries({ queryKey: ['my-sessions'] });
            cache.invalidateQueries({ queryKey: ['notifications'] });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("Impossible de réserver cette séance."));
        } finally {
            setBusy(false);
        }
    }
    async function leave() {
        setBusy(true);
        try {
            await cancel({ data: { screeningId: session.id } });
            toast.success(t("Votre inscription a été annulée."));
            setDetails(false);
            cache.invalidateQueries({ queryKey: ['catalogue'] });
            cache.invalidateQueries({ queryKey: ['my-sessions'] });
            cache.invalidateQueries({ queryKey: ['notifications'] });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("Impossible d'annuler cette inscription."));
        } finally {
            setBusy(false);
        }
    }
    return <article className="movie-card"><div className="poster-wrap"><Link to="/films/$id" params={{ id: movie.id }} className="poster-link" aria-label={`${t("Détails")} — ${t(movie.title)}`}><img src={posters[movie.poster_url] ?? movie.poster_url} alt={`Affiche de ${t(movie.title)}`} width={768} height={1152} loading="lazy"/></Link><span className={`status-badge ${session.status === 'Registration Open' ? 'status-open' : ''}`}><span />{t(statusLabel(session.status))}</span><Button className="poster-details" variant="secondary" size="icon" aria-label={`Détails de ${t(movie.title)}`} asChild><Link to="/films/$id" params={{ id: movie.id }}><ArrowUpRight /></Link></Button><div className="poster-title">{t(movie.title)}</div></div><div className="movie-info"><div className="movie-genre">{t(movie.genre)}<span>·</span><Clock3 size={12}/>{durationLabel(movie)}</div><h3><Link to="/films/$id" params={{ id: movie.id }}>{t(movie.title)}</Link></h3>{liveNote}<div className="movie-date"><CalendarDays size={14}/>{formatDate(session.starts_at)}</div><div className="movie-bottom"><span><Users size={14}/>{session.participant_count} {t("spectateurs")}</span>{roomLink ? roomLink : registered ? <Button variant="secondary" size="sm" onClick={() => setDetails(true)}><Check />{t("Inscrit")}</Button> : open ? user ? <Button size="sm" disabled={busy} onClick={join}>{busy ? t("R\u00E9servation\u2026") : t("Rejoindre")}<ArrowUpRight /></Button> : <Button size="sm" asChild><Link to="/auth">{t("Rejoindre")}<ArrowUpRight /></Link></Button> : <Button variant="secondary" size="sm" onClick={() => setDetails(true)}>{t("D\u00E9tails")}</Button>}</div></div><Dialog open={details} onOpenChange={v => { setDetails(v); if (!v) setTrailer(false); }}><DialogContent><DialogHeader><DialogTitle>{t(movie.title)}</DialogTitle><DialogDescription>{t(movie.genre)} · {durationLabel(movie)} · {movie.year}</DialogDescription></DialogHeader>{liveNote}<p className="text-muted-foreground leading-relaxed">{t(movie.synopsis)}</p><p><CalendarDays className="inline mr-2" size={16}/>{formatDate(session.starts_at)}</p><p>{t(statusLabel(session.status))} · {session.participant_count} {t("spectateurs")}</p>{movie.trailer_url && (trailer ? <div className="trailer-frame">{trailerId ? <iframe src={youtubeEmbed(trailerId, 0, false) + '&autoplay=1'} title={`Bande-annonce de ${t(movie.title)}`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen /> : <video src={movie.trailer_url} controls autoPlay playsInline />}</div> : <Button variant="secondary" onClick={() => setTrailer(true)}><Play />{t("Bande-annonce")}</Button>)}{roomLink}{registered && !roomLink && <p className="text-sm text-muted-foreground">{t("Votre inscription est confirmée. Vous recevrez un e-mail de rappel lorsque la séance va commencer.")}</p>}{registered && !['Finished', 'Cancelled'].includes(session.status) && <Button variant="outline" onClick={leave} disabled={busy}>{t("Annuler l'inscription")}</Button>}{open && !registered && (user ? <Button onClick={join} disabled={busy}>{t("R\u00E9server ma place")}</Button> : <Button asChild><Link to="/auth">{t("Se connecter pour r\u00E9server")}</Link></Button>)}</DialogContent></Dialog></article>;
}
