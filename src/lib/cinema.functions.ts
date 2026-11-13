import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function ensureUserProfile(userId: string, userClient: ReturnType<typeof createClient<Database>>) {
  const existing = await userClient.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (existing.data) return;
  if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const authUser = await supabaseAdmin.auth.admin.getUserById(userId);
      const meta = authUser.data.user?.user_metadata;
      const email = authUser.data.user?.email;
      const displayName = String(meta?.['display_name'] ?? email?.split('@')[0] ?? 'Spectateur');
      await supabaseAdmin.from('profiles').upsert({ id: userId, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true });
      return;
    } catch { /* Fall back to user client below. */ }
  }
  await userClient.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
}

export const ensureProfile = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await ensureUserProfile(context.userId, context.supabase);
  return { ok: true };
});

export const registerForScreening = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ screeningId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureUserProfile(context.userId, context.supabase);
    const { error } = await context.supabase.rpc('register_screening', { _screening_id: data.screeningId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelScreeningRegistration = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ screeningId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const client = process.env['SUPABASE_SERVICE_ROLE_KEY']
      ? (await import('@/integrations/supabase/client.server')).supabaseAdmin
      : context.supabase;
    const { error } = await client
      .from('participants')
      .delete()
      .eq('screening_id', data.screeningId)
      .eq('user_id', context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCatalogue = createServerFn({ method: 'GET' }).handler(async () => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  const client = createClient<Database>(process.env['SUPABASE_URL']!, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization'); headers.set('apikey', key); return fetch(input, { ...init, headers }); } } });
  const [sessions, counts] = await Promise.all([client.from('screenings').select('*, movies(*)').order('starts_at'), client.rpc('screening_counts')]);
  if (sessions.error) throw new Error('La programmation est momentanément indisponible.');
  if (counts.error) throw new Error('Les places disponibles sont momentanément indisponibles.');
  return (sessions.data ?? []).map(s => ({ ...s, participant_count: counts.data?.find(c => c.screening_id === s.id)?.participant_count ?? 0 }));
});

export const getAdminData = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error || !allowed) throw new Error('Accès réservé aux administrateurs.');
  const [movies, screenings, profiles, participants, suggestions, roles] = await Promise.all([context.supabase.from('movies').select('*').order('created_at', { ascending: false }), context.supabase.from('screenings').select('*,movies(*)').order('starts_at'), context.supabase.from('profiles').select('*'), context.supabase.from('participants').select('*,profiles(display_name,avatar_url)'), context.supabase.from('movie_suggestions').select('*').order('created_at', { ascending: false }), context.supabase.from('user_roles').select('user_id,role')]);
  for (const result of [movies,screenings,profiles,participants,suggestions,roles]) if (result.error) throw new Error(result.error.message);
  return { movies: movies.data ?? [], screenings: screenings.data ?? [], profiles: profiles.data ?? [], participants: participants.data ?? [], suggestions: suggestions.data ?? [], roles: roles.data ?? [] };
});