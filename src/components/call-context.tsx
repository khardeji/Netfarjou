import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { joinFriendCall, respondFriendCall, startFriendCall } from '@/lib/friends.functions';
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

export function CallProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const startCallFn = useServerFn(startFriendCall);
  const joinCallFn = useServerFn(joinFriendCall);
  const respondCallFn = useServerFn(respondFriendCall);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [busy, setBusy] = useState(false);
  const [callVolume, setCallVolumeState] = useState(1);
  const callVolumeRef = useRef(1);
  const roomRef = useRef<Room | null>(null);
  const audioHostRef = useRef<HTMLDivElement>(null);

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
    if (typeof window !== 'undefined' && (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia)) {
      throw new Error(
        t('Les appels vocaux ne sont pas supportés dans ce navigateur. Ouvrez le site dans Safari ou Chrome et autorisez le microphone.'),
      );
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
    room.on(RoomEvent.ParticipantDisconnected, syncCount);
    await room.connect(payload.url, payload.token);
    let micMuted = false;
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch {
      micMuted = true;
      toast.error(t('Microphone refusé ou indisponible : vous êtes connecté en écoute seule.'));
    }
    roomRef.current = room;
    setActiveCall({ callId: payload.callId, muted: micMuted, participants: room.remoteParticipants.size + 1 });
  }

  async function beginCall(friendIds: string[], canCall: boolean) {
    if (!canCall || !friendIds.length) return;
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

  async function joinCall(callId: string, canCall: boolean) {
    if (!canCall) return;
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

