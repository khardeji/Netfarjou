import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Mic, MicOff, Phone, PhoneIncoming, PhoneOff, Volume2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-context';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { joinFriendCall, respondFriendCall, startFriendCall } from '@/lib/friends.functions';
import { friendsOptions } from '@/lib/friends.queries';
import { t } from '@/lib/i18n';

export type ActiveCallState = {
  callId: string;
  muted: boolean;
  participants: number;
};

type CallContextValue = {
  activeCall: ActiveCallState | null;
  busy: boolean;
  callVolume: number;
  setCallVolume: (volume: number) => void;
  beginCall: (friendIds: string[], canCall: boolean) => Promise<void>;
  joinCall: (callId: string, canCall: boolean) => Promise<void>;
  toggleMute: () => Promise<void>;
  hangUp: (callId: string, state?: 'left' | 'declined') => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

function startRingtone(): () => void {
  if (typeof window === 'undefined') return () => {};
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return () => {};

  let stopped = false;
  let ctx: AudioContext | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const playBurst = () => {
    if (stopped) return;
    try {
      if (!ctx) ctx = new AudioCtx();
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      if (ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const playTone = (startOffset: number, duration: number) => {
        if (!ctx) return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now + startOffset);
        osc2.frequency.setValueAtTime(480, now + startOffset);

        gain.gain.setValueAtTime(0.0001, now + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.08, now + startOffset + 0.03);
        gain.gain.setValueAtTime(0.08, now + startOffset + duration - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now + startOffset);
        osc2.start(now + startOffset);
        osc1.stop(now + startOffset + duration);
        osc2.stop(now + startOffset + duration);
      };

      playTone(0, 0.35);
      playTone(0.5, 0.35);
    } catch {
      /* Ignore audio errors when autoplay is blocked. */
    }
  };

  playBurst();
  intervalId = setInterval(playBurst, 2600);

  return () => {
    stopped = true;
    if (intervalId) clearInterval(intervalId);
    if (ctx) void ctx.close().catch(() => {});
  };
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const startCallFn = useServerFn(startFriendCall);
  const joinCallFn = useServerFn(joinFriendCall);
  const respondCallFn = useServerFn(respondFriendCall);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [busy, setBusy] = useState(false);
  const [callVolume, setCallVolumeState] = useState(1);
  const callVolumeRef = useRef(1);
  const roomRef = useRef<Room | null>(null);
  const connectedAtRef = useRef(0);
  const audioHostRef = useRef<HTMLDivElement>(null);

  const friendsQuery = useQuery({
    ...friendsOptions,
    enabled: Boolean(user),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`call-invites-${user.id}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_call_members', filter: `user_id=eq.${user.id}` },
        () => {
          void cache.invalidateQueries({ queryKey: ['friends'] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, cache]);

  const canCall = Boolean(friendsQuery.data?.callProviderAvailable);
  const incomingCall = !activeCall
    ? (friendsQuery.data?.calls ?? []).find((c) => c.myState === 'invited')
    : undefined;

  useEffect(() => {
    if (!incomingCall || !canCall) return;
    const stop = startRingtone();
    return stop;
  }, [incomingCall?.id, canCall]);

  const applyVolumeToElements = (volume: number) => {
    const host = audioHostRef.current;
    if (!host) return;
    host.querySelectorAll('audio').forEach((el) => {
      el.volume = volume;
    });
  };

  const setCallVolume = (volume: number) => {
    const clamped = Math.min(1, Math.max(0, volume));
    callVolumeRef.current = clamped;
    setCallVolumeState(clamped);
    applyVolumeToElements(clamped);
  };

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        void roomRef.current.disconnect();
        roomRef.current = null;
      }
      if (audioHostRef.current) audioHostRef.current.innerHTML = '';
    };
  }, []);

  async function connectToCall(payload: { callId: string; url: string; token: string }) {
    if (typeof window !== 'undefined') {
      const hasWebRtc = Boolean(window.RTCPeerConnection || (window as unknown as { webkitRTCPeerConnection?: unknown }).webkitRTCPeerConnection);
      if (!hasWebRtc) {
        const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        throw new Error(
          isIos
            ? t('Votre iPhone bloque les appels (Mode d’isolement activé). Dans Safari, touchez « aA » › Réglages du site web › désactivez « Mode d’isolement » pour netfarjou.vercel.app, puis rechargez la page.')
            : t('Les appels vocaux ne sont pas supportés dans ce navigateur. Ouvrez le site dans Safari ou Chrome.'),
        );
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(t('Le microphone est indisponible : ouvrez le site en HTTPS dans Safari ou Chrome.'));
      }
    }
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (audioHostRef.current) audioHostRef.current.innerHTML = '';
    const room = new Room();
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio && audioHostRef.current) {
        const el = track.attach();
        if (el instanceof HTMLMediaElement) {
          el.volume = callVolumeRef.current;
        }
        audioHostRef.current.appendChild(el);
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
    });
    const syncCount = () => {
      setActiveCall((prev) => (prev ? { ...prev, participants: room.remoteParticipants.size + 1 } : prev));
    };
    room.on(RoomEvent.ParticipantConnected, syncCount);
    room.on(RoomEvent.ParticipantDisconnected, () => {
      syncCount();
      // Everyone else left: the call is over for the last remaining person too.
      if (room.remoteParticipants.size === 0) void leaveEndedCallRef.current(payload.callId);
    });
    await room.connect(payload.url, payload.token);
    let micMuted = false;
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch {
      micMuted = true;
      toast.error(t('Microphone refusé ou indisponible : vous êtes connecté en écoute seule.'));
    }
    roomRef.current = room;
    connectedAtRef.current = Date.now();
    setActiveCall({ callId: payload.callId, muted: micMuted, participants: room.remoteParticipants.size + 1 });
  }

  async function leaveLocally() {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (audioHostRef.current) audioHostRef.current.innerHTML = '';
    setActiveCall(null);
  }

  const leaveEndedCallRef = useRef<(callId: string) => Promise<void>>(async () => {});
  leaveEndedCallRef.current = async (callId: string) => {
    await leaveLocally();
    toast.info(t('L’appel est terminé.'));
    try {
      await respondCallFn({ data: { callId, state: 'left' } });
    } catch { /* The call is already over. */ }
    await cache.invalidateQueries({ queryKey: ['friends'] });
  };

  // The server ended the call (e.g. the other person hung up): disconnect this device as well.
  useEffect(() => {
    if (!activeCall || !friendsQuery.data) return;
    if (friendsQuery.dataUpdatedAt <= connectedAtRef.current) return; // data fetched before this call existed
    const stillActive = (friendsQuery.data.calls ?? []).some((c) => c.id === activeCall.callId);
    if (!stillActive && !busy) {
      void leaveLocally().then(() => toast.info(t('L’appel est terminé.')));
    }
  }, [friendsQuery.data, friendsQuery.dataUpdatedAt, activeCall?.callId]);

  async function beginCall(friendIds: string[], providerReady: boolean) {
    if (!providerReady || !friendIds.length) return;
    setBusy(true);
    try {
      const payload = await startCallFn({ data: { friendIds } });
      await connectToCall(payload);
      await cache.invalidateQueries({ queryKey: ['friends'] });
      toast.success(t('Appel démarré'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Impossible de démarrer l’appel.'));
    } finally {
      setBusy(false);
    }
  }

  async function joinCall(callId: string, providerReady: boolean) {
    if (!providerReady) return;
    setBusy(true);
    try {
      const payload = await joinCallFn({ data: { callId } });
      await connectToCall(payload);
      await cache.invalidateQueries({ queryKey: ['friends'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Impossible de rejoindre l’appel.'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleMute() {
    if (!roomRef.current || !activeCall) return;
    const nextMuted = !activeCall.muted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
    setActiveCall({ ...activeCall, muted: nextMuted });
  }

  async function hangUp(callId: string, state: 'left' | 'declined' = 'left') {
    setBusy(true);
    try {
      if (activeCall?.callId === callId && roomRef.current) {
        await roomRef.current.disconnect();
        roomRef.current = null;
        if (audioHostRef.current) audioHostRef.current.innerHTML = '';
        setActiveCall(null);
      }
      await respondCallFn({ data: { callId, state } });
      await cache.invalidateQueries({ queryKey: ['friends'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Impossible de quitter l’appel.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CallContext.Provider
      value={{ activeCall, busy, callVolume, setCallVolume, beginCall, joinCall, toggleMute, hangUp }}
    >
      {children}
      <div ref={audioHostRef} className="hidden" aria-hidden="true" />
      {incomingCall && canCall && (
        <aside className="incoming-call-alert" role="alertdialog" aria-label={t('Appel entrant')}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="incoming-call-ring">
              <PhoneIncoming size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {t('Appel entrant')}
              </p>
              <p className="text-sm font-medium truncate">
                {incomingCall.members.map((m) => m.display_name).join(', ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              className="flex-1 sm:flex-initial"
              disabled={busy}
              onClick={() => void joinCall(incomingCall.id, canCall)}
            >
              <Phone size={15} />
              {t('Rejoindre')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-initial"
              disabled={busy}
              onClick={() => void hangUp(incomingCall.id, 'declined')}
            >
              <X size={15} />
              {t('Refuser')}
            </Button>
          </div>
        </aside>
      )}
      {activeCall && (
        <aside className="floating-call-bar" aria-label={t('Appel en cours')}>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="live-dot" />
            <Phone size={14} />
            <span>
              {activeCall.participants}{' '}
              {activeCall.participants > 1 ? t('participants') : t('participant')}
            </span>
          </div>
          <label className="floating-call-volume" title={t("Volume de l'appel")}>
            <Volume2 size={14} />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(callVolume * 100)}
              aria-label={t("Volume de l'appel")}
              onChange={(e) => setCallVolume(Number(e.target.value) / 100)}
            />
            <span>{Math.round(callVolume * 100)}%</span>
          </label>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              title={activeCall.muted ? t('Réactiver le micro') : t('Couper le micro')}
              aria-label={activeCall.muted ? t('Réactiver le micro') : t('Couper le micro')}
              onClick={() => void toggleMute()}
            >
              {activeCall.muted ? <MicOff size={14} /> : <Mic size={14} />}
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              disabled={busy}
              title={t('Raccrocher')}
              aria-label={t('Raccrocher')}
              onClick={() => void hangUp(activeCall.callId, 'left')}
            >
              <PhoneOff size={14} />
            </Button>
          </div>
        </aside>
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
