import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const roomInput = z.object({ id: z.string().uuid() });
export const getRoom = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(roomInput).handler(async ({ data, context }) => {
  const { data: allowed, error } = await context.supabase.rpc('can_enter_screening', { _screening_id: data.id });
  if (error || !allowed) throw new Error('Cette salle est fermée ou votre inscription n’est pas confirmée.');
  const [screening, messages, presence, role] = await Promise.all([
    context.supabase.from('screenings').select('*, movies(*)').eq('id', data.id).single(),
    context.supabase.from('room_messages').select('*').eq('screening_id', data.id).order('created_at', { ascending: false }).limit(100),
    context.supabase.from('room_presence').select('*').eq('screening_id', data.id).gte('last_seen', new Date(Date.now() - 45_000).toISOString()),
    context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' }),
  ]);
  if (screening.error || messages.error || presence.error || role.error) throw new Error('La salle est momentanément indisponible.');
  if (screening.data.movies?.video_storage_path) {
    const signed = await context.supabase.storage.from('cinema-videos').createSignedUrl(screening.data.movies.video_storage_path, Math.max(3600, Math.ceil((screening.data.movies.duration_seconds ?? screening.data.movies.duration * 60) + 3600)));
    if (signed.error) throw new Error('La vidéo est momentanément indisponible.');
    screening.data.movies.video_url = signed.data.signedUrl;
  }
  return { screening: screening.data, messages: (messages.data ?? []).reverse(), presence: presence.data ?? [], admin: role.data === true, serverTime: Date.now() };
});
export const setPlayback = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(roomInput.extend({ position: z.number().finite().min(0), playing: z.boolean() })).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (role.error || !role.data) throw new Error('Seul l’administrateur peut contrôler la projection.');
  const result = await context.supabase.from('screenings').update({ playback_position: data.position, is_playing: data.playing, playback_updated_at: new Date().toISOString() }).eq('id', data.id).eq('status', 'Live').select('id').single();
  if (result.error) throw new Error('La projection doit être en direct pour modifier la lecture.');
});