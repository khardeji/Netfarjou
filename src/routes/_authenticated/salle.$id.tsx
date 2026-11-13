import { durationLabel, movieSeconds } from '@/lib/video-media';
import { t } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { createFileRoute, Link } from '@tanstack/react-router';
import { queryOptions, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Film, Pause, Play, Send, Users, Volume2, VolumeX, Maximize, RefreshCw, MessageSquare, MessageSquareOff, SlidersHorizontal, Mic, MicOff, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCall } from '@/components/call-context';
import { supabase } from '@/integrations/supabase/client';
import { headMeta, isMatchGenre, posters, statusLabel } from '@/lib/cinema';
import { getRoom } from '@/lib/room.functions';
import { liveEnded, liveOffset, youtubeEmbed, youtubeId } from '@/lib/room';
const roomOptions = (id: string) => queryOptions({ queryKey: ['room', id], queryFn: () => getRoom({ data: { id } }), refetchInterval: 15000 });
export const Route = createFileRoute('/_authenticated/salle/$id')({
    head: () => headMeta('Salle de projection', 'Partagez une séance de cinéma synchronisée et échangez avec les spectateurs sur Netfarjou.'),
    loader: ({ context, params }) => context.queryClient.ensureQueryData(roomOptions(params.id)),
    errorComponent: ({ error, reset }) => <main className="empty-state"><Film /><h3>{t("Salle indisponible")}</h3><p>{error instanceof Error ? error.message : t("Impossible de rejoindre cette salle.")}</p><Button onClick={reset} variant="outline"><RefreshCw />{t("R\u00E9essayer")}</Button><Button asChild><Link to="/mes-seances">{t("Mes s\u00E9ances")}</Link></Button></main>,
    component: ScreeningRoom,
});
function ScreeningRoom() {
 useTranslation();
    const { id } = Route.useParams();
    const { data } = useSuspenseQuery(roomOptions(id));
    const cache = useQueryClient();
    const video = useRef<HTMLVideoElement>(null);
    const stage = useRef<HTMLDivElement>(null);
    const chat = useRef<HTMLDivElement>(null);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [muted, setMuted] = useState(true);
    const [filmVolume, setFilmVolume] = useState(1);
    const { activeCall, callVolume, setCallVolume, toggleMute } = useCall();
    const [needsPlay, setNeedsPlay] = useState(false);
    const [mediaError, setMediaError] = useState(false);
    const [connected, setConnected] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const screening = data.screening;
    const movie = screening.movies;
    const latest = useRef(data);
    latest.current = data;
    useEffect(() => {
        let active = true;
        const refresh = () => { if (active)
            void cache.invalidateQueries({ queryKey: ['room', id] }); };
        const channel = supabase.channel(`room-${id}-${crypto.randomUUID()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'screenings', filter: `id=eq.${id}` }, refresh)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `screening_id=eq.${id}` }, refresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_presence', filter: `screening_id=eq.${id}` }, refresh)
            .subscribe(status => { if (active)
            setConnected(status === 'SUBSCRIBED'); });
        const heartbeat = async () => { const result = await supabase.rpc('touch_room_presence', { _screening_id: id }); if (result.error)
            refresh(); };
        void heartbeat();
        const timer = setInterval(heartbeat, 15000);
        return () => { active = false; clearInterval(timer); void supabase.removeChannel(channel); };
    }, [id, cache]);
    useEffect(() => { chat.current?.scrollTo({ top: chat.current.scrollHeight, behavior: 'auto' }); }, [data.messages.length]);
    useEffect(() => {
        const sync = () => {
            const element = video.current;
            const state = latest.current.screening;
            if (!element || element.readyState < 1)
                return;
            if (state.status === "Live" && liveOffset(state.starts_at, Date.now()) >= element.duration) { element.pause(); setEnded(true); return; }
            const target = state.status === "Live" ? liveOffset(state.starts_at, Date.now(), element.duration) : 0;
            if (Math.abs(element.currentTime - target) > 1.5)
                element.currentTime = target;
            setPosition(element.currentTime);
            setDuration(element.duration);
            if (element.ended) return;
            if (state.status === 'Live') {
                if (element.paused)
                    void element.play().then(() => setNeedsPlay(false)).catch(() => setNeedsPlay(true));
            }
            else
                element.pause();
        };
        sync();
        const timer = setInterval(sync, 1000);
        return () => clearInterval(timer);
    }, [screening.starts_at, screening.status]);
    async function toggleChat() {
        setBusy(true);
        const result = await supabase.from('screenings').update({ chat_enabled: !screening.chat_enabled }).eq('id', id);
        setBusy(false);
        if (result.error) { toast.error(result.error.message); return; }
        await cache.invalidateQueries({ queryKey: ['room', id] });
    }
    async function send(event: FormEvent) {
        event.preventDefault();
        if (!text.trim() || busy)
            return;
        setBusy(true);
        try {
            const result = await supabase.rpc('send_room_message', { _screening_id: id, _body: text.trim() });
            if (result.error)
                throw result.error;
            setText('');
            await cache.invalidateQueries({ queryKey: ['room', id] });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : t("Message non envoy\u00E9."));
        }
        finally {
            setBusy(false);
        }
    }
    const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    const source = movie?.video_url;
    const ytId = youtubeId(source);
    const playable = !!source && /^https:\/\//i.test(source);
    const live = screening.status === 'Live';
    // Start position computed once when the room opens / goes live, so the iframe is not reloaded every refresh.
    const [ytStart, setYtStart] = useState(() => liveOffset(screening.starts_at, Date.now()));
    useEffect(() => { setYtStart(liveOffset(screening.starts_at, Date.now())); }, [screening.status, screening.starts_at]);
    const chatOn = screening.chat_enabled;
    const yt = useRef<HTMLIFrameElement>(null);
    const [ytLen, setYtLen] = useState(0);
    const [ended, setEnded] = useState(() => liveEnded(screening.starts_at, movieSeconds(movie) / 60, Date.now()));
    useEffect(() => {
        const check = () => { if (live && movie && liveEnded(screening.starts_at, movieSeconds(movie) / 60, Date.now())) setEnded(true); };
        check(); const timer = setInterval(check, 5000);
        const onMessage = (e: MessageEvent) => {
            if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
            try { const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; if ((d.event === 'onStateChange' && d.info === 0) || (d.event === 'infoDelivery' && d.info?.playerState === 0)) setEnded(true); const len = d.event === 'infoDelivery' ? d.info?.duration : d.event === 'initialDelivery' ? d.info?.duration : undefined; if (typeof len === 'number' && len > 0) setYtLen(len); } catch { /* ignore */ }
        };
        window.addEventListener('message', onMessage);
        return () => { clearInterval(timer); window.removeEventListener('message', onMessage); };
    }, [live, movie, screening.starts_at]);
    useEffect(() => {
        if (!ytId || !live) return;
        const tick = () => { const off = liveOffset(screening.starts_at, Date.now()); const total = ytLen || movieSeconds(movie); setPosition(Math.min(off, total || off)); setDuration(total); if (ytLen && off >= ytLen - 0.5) setEnded(true); };
        tick(); const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [ytId, live, ytLen, screening.starts_at, movie]);
    const isMatch = isMatchGenre(movie?.genre);
    useEffect(() => {
        if (video.current) {
            video.current.volume = filmVolume;
            video.current.muted = muted || filmVolume === 0;
        }
        const w = yt.current?.contentWindow;
        if (w) {
            w.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.round(filmVolume * 100)] }), '*');
            w.postMessage(JSON.stringify({ event: 'command', func: muted || filmVolume === 0 ? 'mute' : 'unMute', args: [] }), '*');
        }
    }, [filmVolume, muted]);
    const listen = () => { const w = yt.current?.contentWindow; if (w) { w.postMessage(JSON.stringify({ event: 'listening', id: 'netfarjou' }), '*'); w.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), '*'); w.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.round(filmVolume * 100)] }), '*'); } };
    return <main className="room-page content-width">
    <header className="room-heading"><div><div className="section-kicker">{isMatch ? t("NETFARJOU · MATCH EN DIRECT") : t("NETFARJOU \u00B7 SALLE DE PROJECTION")}</div><h1>{movie?.title ?? (isMatch ? 'Match' : 'Séance')}</h1><p>{t(movie?.genre ?? "")} · {durationLabel(movie)}<span className="text-primary">/</span> {t(statusLabel(screening.status))}</p></div><Button variant="outline" asChild><Link to="/mes-seances">{t("Mes s\u00E9ances")}</Link></Button></header>
    <div className="room-layout"><section className="min-w-0"><div className="room-stage" ref={stage}>
      {ended && live ? <div className="room-unavailable">{isMatch ? <Trophy size={40}/> : <Film size={40}/>}<h2>{isMatch ? t("Match terminé") : t("S\u00E9ance termin\u00E9e")}</h2><p>{isMatch ? t("Le match est terminé. Merci d’avoir suivi ce direct avec nous !") : t("Le film est fini. Merci d\u2019avoir regard\u00E9 avec nous !")}</p></div> : ytId && live ? <div className="room-yt"><iframe ref={yt} onLoad={listen} src={youtubeEmbed(ytId, ytStart, true, muted) + '&enablejsapi=1&loop=0'} title={`Projection de ${movie?.title}`} allow="autoplay; encrypted-media" /><div className="room-yt-shield" aria-hidden /></div> : playable && !ytId && !mediaError ? <video ref={video} src={source} poster={movie ? posters[movie.poster_url] ?? movie.poster_url : undefined} muted={muted} playsInline preload="metadata" onEnded={() => setEnded(true)} onError={() => setMediaError(true)} controls={false} disablePictureInPicture onContextMenu={e => e.preventDefault()} aria-label={`Projection de ${movie?.title}`}/> : <div className="room-unavailable"><Film size={40}/><h2>{mediaError ? t("Vid\u00E9o indisponible") : t("La projection se pr\u00E9pare")}</h2><p>{mediaError ? t("La source vid\u00E9o ne peut pas \u00EAtre lue.") : t("Aucune vid\u00E9o autoris\u00E9e n\u2019a encore \u00E9t\u00E9 ajout\u00E9e \u00E0 ce film.")}</p></div>}
      {screening.status === 'Waiting Room' && <div className="room-overlay"><Film /><h2>{t("Bienvenue dans le salon")}</h2><p>{t("En attente du lancement de la projection.")}</p></div>}
      {needsPlay && screening.status === 'Live' && <Button className="room-play" onClick={() => { void video.current?.play().then(() => setNeedsPlay(false)).catch(() => toast.error(t("La lecture ne peut pas d\u00E9marrer."))); }}><Play />{t("Activer la projection")}</Button>}
    </div><div className="room-controls"><Button size="icon" variant="ghost" title={muted ? t("Activer le son") : t("Couper le son")} aria-label={muted ? t("Activer le son") : t("Couper le son")} onClick={() => { if (ytId && muted) setYtStart(liveOffset(screening.starts_at, Date.now())); setMuted(!muted); }}>{muted ? <VolumeX /> : <Volume2 />}</Button>
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" title={t("Paramètres audio")} aria-label={t("Paramètres audio")}>
          <SlidersHorizontal size={15} />
          <span className="hidden sm:inline">{t("Audio")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>{isMatch ? t("Volume du match") : t("Volume du film")}</span>
            <span>{muted ? '0%' : `${Math.round(filmVolume * 100)}%`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : Math.round(filmVolume * 100)}
            aria-label={isMatch ? t("Volume du match") : t("Volume du film")}
            className="w-full accent-primary cursor-pointer"
            onChange={(e) => {
              const next = Number(e.target.value) / 100;
              setFilmVolume(next);
              if (next > 0 && muted) setMuted(false);
              if (next === 0 && !muted) setMuted(true);
            }}
          />
        </div>
        <div className="space-y-1.5 border-t border-border pt-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>{t("Volume de l'appel")}</span>
            <span>{activeCall ? `${Math.round(callVolume * 100)}%` : t("Hors appel")}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            disabled={!activeCall}
            value={Math.round(callVolume * 100)}
            aria-label={t("Volume de l'appel")}
            className="w-full accent-primary cursor-pointer disabled:opacity-40"
            onChange={(e) => setCallVolume(Number(e.target.value) / 100)}
          />
          {activeCall ? (
            <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => void toggleMute()}>
              {activeCall.muted ? <MicOff size={14} /> : <Mic size={14} />}
              {activeCall.muted ? t("Réactiver mon micro") : t("Couper mon micro")}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              <Link to="/profil" className="underline hover:text-foreground">{t("Démarrer un appel avec des amis")}</Link>
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
    {data.admin && <Button size="sm" variant="secondary" disabled={busy} onClick={toggleChat}>{chatOn ? <MessageSquareOff /> : <MessageSquare />}{chatOn ? t("D\u00E9sactiver le chat") : t("Activer le chat")}</Button>}<span className="text-primary">{live ? t("En direct") : ''}</span><span>{clock(position)} / {clock(duration)}</span><Button size="icon" variant="ghost" title={t("Plein \u00E9cran")} aria-label={t("Plein \u00E9cran")} onClick={() => { void stage.current?.requestFullscreen().catch(() => toast.error(t("Plein \u00E9cran indisponible."))); }}><Maximize /></Button></div>
    <div className="room-audience"><h2><Users size={16}/>Dans la salle · {data.presence.length}</h2><div className="flex flex-wrap gap-3 mt-4">{data.presence.map(person => <span className="text-sm text-muted-foreground" key={person.user_id}>{person.display_name}</span>)}</div></div></section>
    <aside className="room-chat"><header><h2>{t("Le salon")}</h2><span className={connected ? 'text-success' : 'text-muted-foreground'}>{connected ? t("Connect\u00E9") : t("Reconnexion\u2026")}</span></header><div className="room-messages" ref={chat} aria-live="polite" role="log">{data.messages.length ? data.messages.map(message => <article key={message.id}><div><strong>{message.display_name}</strong><time>{new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time></div><p>{message.body}</p></article>) : <p className="text-sm text-muted-foreground m-auto">{t("Aucun message pour le moment.")}</p>}</div>{chatOn ? <form onSubmit={send}><input aria-label={t("Votre message")} placeholder={t("Votre message\u2026")} maxLength={1000} value={text} onChange={e => setText(e.target.value)}/><Button type="submit" size="icon" aria-label={t("Envoyer le message")} title={t("Envoyer le message")} disabled={busy || !text.trim()}><Send /></Button></form> : <p className="text-sm text-muted-foreground p-4">{t("Le chat est d\u00E9sactiv\u00E9 pour cette s\u00E9ance.")}</p>}</aside></div>
  </main>;
}
