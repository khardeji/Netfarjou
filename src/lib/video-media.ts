export function movieSeconds(movie?: { duration: number; duration_seconds?: number | null } | null) {
  return movie?.duration_seconds ?? (movie?.duration ?? 0) * 60;
}
export function durationLabel(movie?: { duration: number; duration_seconds?: number | null } | null) {
  const seconds = Math.round(movieSeconds(movie));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function smallerVideo(original: File, compressed: File) { return compressed.size < original.size ? compressed : original; }
export async function readVideoDuration(source: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const timer = setTimeout(() => finish(), 20000);
    const finish = () => { clearTimeout(timer); const seconds = video.duration; video.removeAttribute('src'); video.load(); if (Number.isFinite(seconds) && seconds > 0) resolve(seconds); else reject(new Error('Durée indisponible')); };
    video.onloadedmetadata = finish;
    video.onerror = finish;
    video.src = source;
  });
}
export async function compressVideo(file: File, onProgress: (progress: number) => void, signal: AbortSignal) {
  const { Input, BlobSource, ALL_FORMATS, Output, BufferTarget, WebMOutputFormat, Conversion } = await import('mediabunny');
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const target = new BufferTarget();
    const output = new Output({ target, format: new WebMOutputFormat() });
    const conversion = await Conversion.init({ input, output, tracks: 'primary', video: async track => ({ width: Math.max(2, Math.floor(Math.min(1280, await track.getDisplayWidth()) / 2) * 2), codec: 'vp9', bitrate: 1_500_000, forceTranscode: true }), audio: { codec: 'opus', bitrate: 96_000 }, showWarnings: false });
    if (!conversion.isValid || conversion.discardedTracks.length) throw new Error('Compression indisponible');
    const cancel = () => { void conversion.cancel(); };
    signal.addEventListener('abort', cancel, { once: true });
    try { if (signal.aborted) throw new Error('Annulé'); conversion.onProgress = onProgress; await conversion.execute(); } finally { signal.removeEventListener('abort', cancel); }
    if (signal.aborted || !target.buffer) throw new Error('Annulé');
    return smallerVideo(file, new File([target.buffer], 'projection.webm', { type: 'video/webm' }));
  } finally { input.dispose(); }
}