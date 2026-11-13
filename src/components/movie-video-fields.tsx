import { useEffect, useRef, useState } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { youtubeEmbed, youtubeId } from '@/lib/room';
import { compressVideo, readVideoDuration } from '@/lib/video-media';
import { Button } from './ui/button';

export function MovieVideoFields({ initialUrl = '', initialPath = '', initialSeconds, initialMinutes = 90, onBusy }: { initialUrl?: string; initialPath?: string; initialSeconds?: number | null | undefined; initialMinutes?: number; onBusy: (busy: boolean) => void }) {
  const [url, setUrl] = useState(initialUrl);
  const [path, setPath] = useState(initialPath);
  const [seconds, setSeconds] = useState<number | null>(initialSeconds ?? null);
  const [compress, setCompress] = useState(true);
  const [status, setStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const controller = useRef<AbortController | null>(null);
  const id = youtubeId(url);
  useEffect(() => () => { controller.current?.abort(); onBusy(false); }, [onBusy]);
  useEffect(() => {
    if (!url || path) return;
    let active = true;
    setDetecting(true);
    const timeout = setTimeout(() => { if (active) { setDetecting(false); setStatus(t('Durée indisponible : saisissez les minutes.')); } }, 22000);
    const accept = (value: number) => { if (active && Number.isFinite(value) && value > 0) { setSeconds(value); setDetecting(false); setStatus(''); clearTimeout(timeout); } };
    const message = (event: MessageEvent) => {
      if (event.source !== iframe.current?.contentWindow || event.origin !== 'https://www.youtube-nocookie.com') return;
      try { const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; accept(data.info?.duration); } catch { /* unrelated message */ }
    };
    window.addEventListener('message', message);
    const poll = setInterval(() => { iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'duration' }), 'https://www.youtube-nocookie.com'); }, 500);
    if (!id) void readVideoDuration(url).then(accept).catch(() => { if (active) { setDetecting(false); setStatus(t('Durée indisponible : saisissez les minutes.')); } });
    return () => { active = false; clearTimeout(timeout); clearInterval(poll); window.removeEventListener('message', message); };
  }, [url, path, id, attempt]);
  async function upload(file: File) {
    const abort = new AbortController(); controller.current = abort;
    setProcessing(true); onBusy(true); setStatus(t('Lecture de la durée…'));
    const objectUrl = URL.createObjectURL(file);
    try {
      const length = await readVideoDuration(objectUrl);
      let ready = file;
      if (compress) ready = await compressVideo(file, progress => setStatus(`${t('Compression…')} ${Math.round(progress * 100)} %`), abort.signal);
      if (abort.signal.aborted) return;
      if (ready.size > 1024 ** 3) throw new Error(t('La vidéo dépasse 1 Go.'));
      setStatus(t('Importation…'));
      const extension = ready.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'mp4';
      const storagePath = `${crypto.randomUUID()}.${extension}`;
      const result = await supabase.storage.from('cinema-videos').upload(storagePath, ready, { contentType: ready.type || 'video/mp4' });
      if (result.error) throw new Error(result.error.message);
      if (abort.signal.aborted) { await supabase.storage.from('cinema-videos').remove([storagePath]); return; }
      setUrl(''); setPath(storagePath); setSeconds(length);
      setStatus(`${t('Vidéo importée')} · ${(file.size / 1048576).toFixed(1)} → ${(ready.size / 1048576).toFixed(1)} Mo`);
    } catch (error) { if (!abort.signal.aborted) setStatus(error instanceof Error ? error.message : t('Importation impossible.')); }
    finally { URL.revokeObjectURL(objectUrl); if (!abort.signal.aborted) { setProcessing(false); onBusy(false); } }
  }
  return <>
    <label className="field">{t('Durée (minutes)')}<input name="duration" type="number" min="0.01" step="any" key={seconds ?? 'manual'} defaultValue={seconds ? Number((seconds / 60).toFixed(4)) : initialMinutes} readOnly={seconds !== null} required />{seconds !== null && <span className="text-sm text-success">{t('Durée détectée')} · {Math.floor(seconds / 60)}:{String(Math.floor(seconds % 60)).padStart(2, '0')}</span>}</label>
    <div className="field full-field"><label htmlFor="movie-video-url">{t('Vidéo autorisée (URL)')}</label><div className="flex gap-2"><input id="movie-video-url" name="video" type="url" value={url} disabled={processing} onChange={event => { setUrl(event.target.value); setPath(''); setSeconds(null); setStatus(''); }} /><Button type="button" size="icon" variant="outline" aria-label={t('Détecter la durée')} title={t('Détecter la durée')} disabled={!url || processing} onClick={() => setAttempt(value => value + 1)}><RefreshCw /></Button></div></div>
    <div className="field full-field"><input ref={fileInput} type="file" accept="video/*" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ''; }} /><div className="flex flex-wrap gap-4 items-center"><Button type="button" variant="outline" disabled={processing} onClick={() => fileInput.current?.click()}><Upload />{t('Importer une vidéo')}</Button><label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={compress} disabled={processing} onChange={event => setCompress(event.target.checked)} />{t('Compresser avant import')}</label>{processing && <Button type="button" variant="ghost" onClick={() => { controller.current?.abort(); setProcessing(false); onBusy(false); setStatus(t('Annulé')); }}>{t('Annuler')}</Button>}</div><p className="text-sm text-muted-foreground" role="status">{detecting ? t('Lecture de la durée…') : status || (path ? t('Vidéo importée') : '')}</p></div>
    <input type="hidden" name="duration_seconds" value={seconds ?? ''} /><input type="hidden" name="video_storage_path" value={path} />
    {id && detecting && <iframe ref={iframe} className="hidden" src={`${youtubeEmbed(id)}&enablejsapi=1`} title={t('Détecter la durée')} />}
  </>;
}