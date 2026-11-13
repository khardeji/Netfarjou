import { Mic, Settings2, ShieldOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { t } from '@/lib/i18n';

export type CallSupport = 'ok' | 'blocked' | 'no-mic';

export function detectCallSupport(): CallSupport {
  if (typeof window === 'undefined') return 'ok';
  const w = window as unknown as { webkitRTCPeerConnection?: unknown };
  if (!(window.RTCPeerConnection || w.webkitRTCPeerConnection)) return 'blocked';
  if (!navigator.mediaDevices?.getUserMedia) return 'no-mic';
  return 'ok';
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export class CallUnsupportedError extends Error {
  constructor() {
    super('CALL_UNSUPPORTED');
  }
}

function Step({ n, icon, title, text }: { n: number; icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex gap-3 rounded-lg border border-border bg-card/60 p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
        {n}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}

export function CallHelpDialog({ open, onOpenChange, reason }: { open: boolean; onOpenChange: (open: boolean) => void; reason: CallSupport }) {
  const ios = isIosDevice();
  const host = typeof window !== 'undefined' ? window.location.hostname : 'netfarjou.vercel.app';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff size={18} className="text-primary" />
            {t('Les appels sont bloqués sur cet appareil')}
          </DialogTitle>
          <DialogDescription>
            {ios && reason === 'blocked'
              ? t('Le Mode d’isolement de votre iPhone désactive les appels vocaux. Autorisez ce site en 3 étapes (une seule fois) :')
              : reason === 'no-mic'
                ? t('Le microphone est indisponible dans ce navigateur. Ouvrez le site en HTTPS dans Safari ou Chrome.')
                : t('Ce navigateur ne permet pas les appels vocaux. Ouvrez le site dans Safari ou Chrome.')}
          </DialogDescription>
        </DialogHeader>
        {ios && reason === 'blocked' && (
          <ol className="space-y-2">
            <Step n={1} icon={<Smartphone size={14} />} title={t('Ouvrez le site dans Safari')} text={`${host} — ${t('pas depuis Messenger ou WhatsApp')}`} />
            <Step n={2} icon={<Settings2 size={14} />} title={t('Touchez « aA » › Réglages du site web')} text={t('Le bouton « aA » est dans la barre d’adresse de Safari.')} />
            <Step n={3} icon={<Mic size={14} />} title={t('Désactivez « Mode d’isolement »')} text={t('Puis rechargez la page et relancez l’appel. Autorisez le microphone quand Safari le demande.')} />
          </ol>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Fermer')}
          </Button>
          <Button onClick={() => window.location.reload()}>{t('J’ai changé le réglage, recharger')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

