import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, UserPlus, Users, Check, X, Phone, PhoneOff, Mic, MicOff, ShieldCheck, RefreshCw, Film, Play, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCall } from '@/components/call-context';
import { formatDate, headMeta, statusLabel } from '@/lib/cinema';
import { catalogueOptions } from '@/lib/cinema.queries';
import { cancelScreeningRegistration } from '@/lib/cinema.functions';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';
import { friendsOptions } from '@/lib/friends.queries';
import { addFriend, respondFriend } from '@/lib/friends.functions';
import { friendCodeSchema } from '@/lib/friends';

export const Route = createFileRoute('/_authenticated/profil')({
  head: () => headMeta('Mon profil et amis', 'Retrouvez votre identifiant Netfarjou et vos amis pour partager vos séances de cinéma.'),
  loader: ({ context }) => context.queryClient.ensureQueryData(friendsOptions),
  errorComponent: ({ error, reset }) => (
    <main className="empty-state standard-page">
      <Users />
      <h3>{t('Mon profil et amis')}</h3>
      <p>{error instanceof Error ? t(error.message) : t('Impossible de charger les amis.')}</p>
      <Button onClick={reset} variant="outline"><RefreshCw />{t('Try again')}</Button>
      <Button asChild><Link to="/">{t('Go home')}</Link></Button>
    </main>
  ),
  component: Profile,
});

function Profile() {
  useTranslation();
  const { data } = useSuspenseQuery(friendsOptions);
  const cache = useQueryClient();
  const request = useServerFn(addFriend);
  const respond = useServerFn(respondFriend);
  const cancelRegistration = useServerFn(cancelScreeningRegistration);
  const { activeCall, busy: callBusy, beginCall: beginCallCtx, joinCall: joinCallCtx, toggleMute, hangUp } = useCall();
  const [code, setCode] = useState('');
  const [localBusy, setLocalBusy] = useState(false);
  const busy = localBusy || callBusy;
  const setBusy = setLocalBusy;
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const profile = data.profile;
  const friendships = data.friendships ?? [];
  const accepted = friendships.filter(f => f.status === 'accepted');
  const pending = friendships.filter(f => f.status === 'pending');
  const canCall = Boolean(data.callProviderAvailable);
  const incomingCalls = (data.calls ?? []).filter(c => c.id !== activeCall?.callId);
  const inCall = !!activeCall || (data.calls ?? []).some(c => c.myState === 'joined');
  const beginCall = (friendIds: string[]) => beginCallCtx(friendIds, canCall);
  const joinCall = (callId: string) => joinCallCtx(callId, canCall);
  const catalogue = useQuery(catalogueOptions);
  const mine = useQuery({
    queryKey: ['my-sessions', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const res = await supabase.from('participants').select('screening_id').eq('user_id', profile.id);
      if (res.error) throw res.error;
      return res.data ?? [];
    },
  });
  const registeredSessions = (catalogue.data ?? []).filter(s => mine.data?.some(p => p.screening_id === s.id));

  async function cancelScreening(screeningId: string) {
    setBusy(true);
    try {
      await cancelRegistration({ data: { screeningId } });
      toast.success(t("Votre inscription a été annulée."));
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['catalogue'] }),
        cache.invalidateQueries({ queryKey: ['my-sessions'] }),
        cache.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Impossible d'annuler cette inscription."));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    const parsed = friendCodeSchema.safeParse(code);
    if (!parsed.success) { setError(t('Identifiant invalide')); return; }
    setBusy(true);
    try { await request({ data: parsed.data }); setCode(''); await cache.invalidateQueries({ queryKey: ['friends'] }); toast.success(t('Demande envoyée')); }
    catch (e) { setError(t(e instanceof Error ? e.message : 'Impossible de charger les amis.')); }
    finally { setBusy(false); }
  }
  async function answer(id: string, accept: boolean) {
    setBusy(true); setError('');
    try { await respond({ data: { id, accept } }); await cache.invalidateQueries({ queryKey: ['friends'] }); }
    catch { setError(t('Impossible de modifier cette demande.')); }
    finally { setBusy(false); }
  }

  return <main className="standard-page content-width friends-page">
    <header className="page-heading"><div className="section-kicker">NETFARJOU / {t('Mon compte')}</div><h1>{t('Mon profil et amis')}<span className="heading-dot">.</span></h1></header>
    <section className="profile-identity" aria-label={t('Mon profil')}>
      <div className="friend-avatar">{(profile?.display_name || 'N').slice(0, 1).toUpperCase()}</div>
      <div className="min-w-0"><h2 className="text-xl font-semibold">{profile?.display_name || t('Mon compte')}</h2><p className="text-sm text-muted-foreground mt-2">{t('Mon identifiant unique')}</p><div className="profile-code"><code dir="ltr">{profile?.friend_code || '—'}</code><Button disabled={!profile?.friend_code} variant="ghost" size="icon" title={t('Copier mon identifiant')} aria-label={t('Copier mon identifiant')} onClick={async () => { if (!profile?.friend_code) return; try { await navigator.clipboard.writeText(profile.friend_code); toast.success(t('Identifiant copié')); } catch { toast.error(t('Copie impossible')); } }}><Copy size={17}/></Button></div></div>
    </section>
    <div className="friends-layout">
      <div>
        <section className="friends-section"><h2><UserPlus size={20}/>{t('Ajouter un ami')}</h2><form onSubmit={submit} className="friend-add-form"><label className="field">{t('Identifiant de votre ami')}<input value={code} onChange={e => setCode(e.target.value)} placeholder="NF-…" maxLength={35} required autoComplete="off" dir="ltr"/></label><Button disabled={busy} type="submit"><UserPlus size={16}/>{t('Envoyer la demande')}</Button></form></section>
        {error && <p role="alert" className="form-error">{error}</p>}
        <section className="friends-section"><h2>{t('Demandes d’amitié')}<span className="friend-count">{pending.length}</span></h2>
          {!pending.length && <p className="text-sm text-muted-foreground">{t('Aucune demande en attente')}</p>}
          {pending.map(f => <article className="friend-row" key={f.id}><div className="min-w-0"><h3>{f.peer?.display_name || t('Mon compte')}</h3><p>{f.incoming ? t('Demande reçue') : t('Demande envoyée')}</p></div><div className="flex gap-2">{f.incoming && <Button disabled={busy} size="sm" onClick={() => answer(f.id, true)}><Check size={15}/>{t('Accepter')}</Button>}<Button disabled={busy} variant="ghost" size="icon" title={f.incoming ? t('Refuser') : t('Annuler')} aria-label={f.incoming ? t('Refuser') : t('Annuler')} onClick={() => answer(f.id, false)}><X size={16}/></Button></div></article>)}
        </section>
      </div>
      <section className="friends-section"><div className="flex items-start justify-between gap-3 flex-wrap"><h2><Users size={20}/>{t('Mes amis')}<span className="friend-count">{accepted.length}</span></h2><Button disabled={!canCall || !selected.length || busy || inCall} variant="outline" size="sm" onClick={() => { const friendUserIds = accepted.filter(f => selected.includes(f.id)).map(f => f.peer?.id).filter((id): id is string => Boolean(id)); void beginCall(friendUserIds); }}><Phone size={15}/>{t('Appel de groupe')}{selected.length > 0 && ` (${selected.length})`}</Button></div>
        {activeCall && (
          <div className="friend-row" role="status">
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-2"><Phone size={15}/>{t('Appel en cours')}</h3>
              <p>{activeCall.participants} {activeCall.participants > 1 ? t('participants') : t('participant')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void toggleMute()}>
                {activeCall.muted ? <MicOff size={15}/> : <Mic size={15}/>}
                {activeCall.muted ? t('Réactiver le micro') : t('Couper le micro')}
              </Button>
              <Button disabled={busy} variant="destructive" size="sm" onClick={() => void hangUp(activeCall.callId, 'left')}>
                <PhoneOff size={15}/>{t('Raccrocher')}
              </Button>
            </div>
          </div>
        )}
        {canCall && incomingCalls.map(c => (
          <div className="friend-row" key={c.id}>
            <div className="min-w-0 flex-1">
              <h3>{c.myState === 'invited' ? t('Appel entrant') : t('Appel actif')}</h3>
              <p>{c.members.map(m => m.display_name).join(', ')}</p>
            </div>
            <div className="flex gap-2">
              <Button disabled={busy || !!activeCall || (inCall && c.myState !== 'joined')} size="sm" onClick={() => void joinCall(c.id)}>
                <Phone size={15}/>{t('Rejoindre')}
              </Button>
              <Button disabled={busy} variant="outline" size="sm" onClick={() => void hangUp(c.id, c.myState === 'invited' ? 'declined' : 'left')}>
                <X size={15}/>{c.myState === 'invited' ? t('Refuser') : t('Quitter')}
              </Button>
            </div>
          </div>
        ))}
        {!accepted.length && <div className="friend-empty"><Users size={32}/><p>{t('Aucun ami pour le moment')}</p></div>}
        {accepted.map(f => <article className="friend-row" key={f.id}><Checkbox aria-label={`${t('Sélectionner')} ${f.peer?.display_name || ''}`} checked={selected.includes(f.id)} onCheckedChange={value => setSelected(current => value ? [...current, f.id] : current.filter(id => id !== f.id))}/><div className="friend-avatar friend-avatar-small">{(f.peer?.display_name || 'N').slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><h3>{f.peer?.display_name || t('Mon compte')}</h3><p className="break-all" dir="ltr">{f.peer?.friend_code}</p></div><Button disabled={!canCall || !f.peer?.id || busy || inCall} variant="ghost" size="icon" title={canCall ? (inCall ? t('Vous êtes déjà dans un appel') : t('Appeler')) : t('Appels indisponibles')} aria-label={t('Appeler')} onClick={() => { if (f.peer?.id) void beginCall([f.peer.id]); }}><Phone size={17}/></Button><Button disabled={busy} variant="ghost" size="icon" title={t('Retirer cet ami')} aria-label={t('Retirer cet ami')} onClick={() => { if (window.confirm(t('Retirer cet ami ?'))) void answer(f.id, false); }}><X size={16}/></Button></article>)}
        {!canCall && <div className="call-unavailable"><Mic size={18}/><div><h3>{t('Appels indisponibles')}</h3><p>{t('Le service audio privé n’est pas activé.')}</p></div></div>}<p className="flex items-center gap-2 text-xs text-muted-foreground mt-4"><ShieldCheck size={15}/>{t('Les appels seront réservés aux amis invités.')}</p>
      </section>
    </div>
    <section className="friends-section mt-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h2><Film size={20}/>{t('Mes inscriptions')}<span className="friend-count">{registeredSessions.length}</span></h2>
        <Button variant="outline" size="sm" asChild><Link to="/seances">{t('Explorer les séances')}</Link></Button>
      </div>
      {mine.isLoading || catalogue.isLoading ? (
        <p className="text-sm text-muted-foreground">{t('Chargement de vos réservations…')}</p>
      ) : !registeredSessions.length ? (
        <div className="friend-empty"><Film size={32}/><p>{t('Vous n’avez pas encore réservé de séance.')}</p></div>
      ) : (
        registeredSessions.map(s => (
          <article className="friend-row" key={s.id}>
            <div className="min-w-0 flex-1">
              <h3><Link to="/films/$id" params={{ id: s.movie_id }}>{t(s.movies?.title ?? '')}</Link></h3>
              <p className="flex items-center gap-2 flex-wrap">
                <CalendarDays size={13}/>{formatDate(s.starts_at)} · {t(statusLabel(s.status))}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['Waiting Room', 'Live'].includes(s.status) && (
                <Button size="sm" asChild><Link to="/salle/$id" params={{ id: s.id }}><Play size={14}/>{t('Entrer dans la salle')}</Link></Button>
              )}
              {!['Finished', 'Cancelled'].includes(s.status) && (
                <Button disabled={busy} variant="outline" size="sm" onClick={() => void cancelScreening(s.id)}>{t('Annuler')}</Button>
              )}
            </div>
          </article>
        ))
      )}
    </section>
  </main>;
}