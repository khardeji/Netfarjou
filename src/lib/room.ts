export type PlaybackState = { is_playing: boolean; playback_position: number; playback_updated_at: string; status: string };
export function playbackTarget(state: PlaybackState, now: number, duration = Infinity) {
  const elapsed = state.is_playing && state.status === 'Live' ? Math.max(0, (now - Date.parse(state.playback_updated_at)) / 1000) : 0;
  return Math.min(duration, Math.max(0, state.playback_position + elapsed));
}
export function roomIsOpen(status: string) { return status === 'Waiting Room' || status === 'Live'; }/** Seconds elapsed since the scheduled start: a viewer arriving late joins the film at the same point as everyone. */
export function liveOffset(startsAt: string, now: number, duration = Infinity) {
  return Math.min(duration, Math.max(0, (now - Date.parse(startsAt)) / 1000));
}
export function youtubeId(url?: string | null) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : null;
}
export function youtubeEmbed(id: string, start = 0, live = false, muted = true) {
  const p = new URLSearchParams({ autoplay: live ? '1' : '0', start: String(Math.floor(start)), rel: '0', modestbranding: '1', playsinline: '1', ...(live ? { controls: '0', disablekb: '1', mute: muted ? '1' : '0', fs: '0' } : {}) });
  return `https://www.youtube-nocookie.com/embed/${id}?${p}`;
}
/** A live screening is over once the film's running time has elapsed since its scheduled start. */
export function liveEnded(startsAt: string, durationMin: number, now: number) {
  return now >= Date.parse(startsAt) + durationMin * 60_000;
}
export function minutesSinceStart(startsAt: string, now: number) { return Math.max(0, Math.floor((now - Date.parse(startsAt)) / 60_000)); }
