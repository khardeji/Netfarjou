import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { friendCodeSchema, friendResponseSchema } from './friends';

function livekitConfig() {
  const url = process.env['LIVEKIT_URL']?.trim();
  const apiKey = process.env['LIVEKIT_API_KEY']?.trim();
  const apiSecret = process.env['LIVEKIT_API_SECRET']?.trim();
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

async function issueCallToken(
  config: { url: string; apiKey: string; apiSecret: string },
  callId: string,
  userId: string,
  displayName: string,
) {
  const { AccessToken } = await import('livekit-server-sdk');
  const at = new AccessToken(config.apiKey, config.apiSecret, {
    identity: userId,
    name: displayName || 'Spectateur',
    ttl: '4h',
  });
  at.addGrant({
    roomJoin: true,
    room: `netfarjou-call-${callId}`,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return { callId, url: config.url, token: await at.toJwt() };
}

export const getFriends = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [profileRes, friendshipsRes] = await Promise.all([
    context.supabase.from('profiles').select('id,display_name,avatar_url,friend_code').eq('id', context.userId).maybeSingle(),
    context.supabase.from('friendships').select('*').order('created_at', { ascending: false }),
  ]);
  if (profileRes.error) throw new Error('Impossible de charger les amis.');
  let profile = profileRes.data;
  if (!profile) {
    if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
      try {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const authUser = await supabaseAdmin.auth.admin.getUserById(context.userId);
        const displayName = String(authUser.data.user?.user_metadata?.['display_name'] ?? authUser.data.user?.email?.split('@')[0] ?? 'Spectateur');
        const created = await supabaseAdmin
          .from('profiles')
          .upsert({ id: context.userId, display_name: displayName }, { onConflict: 'id' })
          .select('id,display_name,avatar_url,friend_code')
          .maybeSingle();
        profile = created.data;
      } catch { /* Fall back to user client or empty profile. */ }
    }
    if (!profile) {
      const created = await context.supabase
        .from('profiles')
        .upsert({ id: context.userId }, { onConflict: 'id' })
        .select('id,display_name,avatar_url,friend_code')
        .maybeSingle();
      profile = created.data ?? { id: context.userId, display_name: '', avatar_url: null, friend_code: '' };
    }
  }
  const friendships = friendshipsRes.error ? [] : (friendshipsRes.data ?? []);
  const ids = friendships.map(f => f.requester_id === context.userId ? f.recipient_id : f.requester_id);
  let peerList: Array<{ id: string; display_name: string; avatar_url: string | null; friend_code: string }> = [];
  if (ids.length) {
    const rpcPeers = await context.supabase.rpc('friend_peer_profiles');
    if (!rpcPeers.error && rpcPeers.data) {
      peerList = rpcPeers.data;
    } else {
      const tablePeers = await context.supabase.from('profiles').select('id,display_name,avatar_url,friend_code').in('id', ids);
      if (!tablePeers.error && tablePeers.data) peerList = tablePeers.data;
    }
  }
  const [callsRes, membersRes] = await Promise.all([
    context.supabase
      .from('friend_calls')
      .select('id,owner_id,screening_id,created_at,expires_at,ended_at')
      .is('ended_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
    context.supabase.from('friend_call_members').select('call_id,user_id,state'),
  ]);
  const callMembers = membersRes.error ? [] : (membersRes.data ?? []);
  const calls = (callsRes.error ? [] : (callsRes.data ?? [])).map(c => {
    const members = callMembers.filter(m => m.call_id === c.id);
    const me = members.find(m => m.user_id === context.userId);
    return {
      ...c,
      myState: me?.state ?? (c.owner_id === context.userId ? 'joined' : 'invited'),
      members: members.map(m => ({
        ...m,
        display_name:
          m.user_id === context.userId
            ? profile.display_name || 'Moi'
            : peerList.find(p => p.id === m.user_id)?.display_name || 'Ami',
      })),
    };
  }).filter(c => c.myState === 'invited' || c.myState === 'joined');

  return {
    profile,
    callProviderAvailable: Boolean(livekitConfig()),
    calls,
    friendships: friendships.map(f => ({
      ...f,
      incoming: f.recipient_id === context.userId,
      peer: peerList.find(p => p.id === (f.requester_id === context.userId ? f.recipient_id : f.requester_id)),
    })),
  };
});

const ALREADY_IN_CALL = 'Vous êtes déjà dans un appel. Raccrochez avant d’en lancer ou d’en rejoindre un autre.';

type CallClient = {
  from: (table: 'friend_calls' | 'friend_call_members') => any;
};

/** Returns the id of an active (not ended, not expired) call the user has already joined, if any. */
async function findJoinedCall(supabase: CallClient, userId: string, exceptCallId?: string): Promise<string | null> {
  const members = await supabase.from('friend_call_members').select('call_id').eq('user_id', userId).eq('state', 'joined');
  const ids: string[] = ((members.data ?? []) as Array<{ call_id: string }>)
    .map(m => m.call_id)
    .filter(id => id !== exceptCallId);
  if (!ids.length) return null;
  const active = await supabase
    .from('friend_calls')
    .select('id')
    .in('id', ids)
    .is('ended_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1);
  return ((active.data ?? []) as Array<{ id: string }>)[0]?.id ?? null;
}

/** A call needs at least 2 people who joined. When fewer remain, the call ends for everybody. */
async function endCallIfTooSmall(supabase: CallClient, callId: string) {
  const joined = await supabase.from('friend_call_members').select('user_id').eq('call_id', callId).eq('state', 'joined');
  if (joined.error) return false;
  if (((joined.data ?? []) as unknown[]).length >= 2) return false;
  const endedAt = new Date().toISOString();
  let ended = false;
  if (process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const res = await supabaseAdmin.from('friend_calls').update({ ended_at: endedAt }).eq('id', callId).is('ended_at', null);
      ended = !res.error;
    } catch { /* Fall back to the user client below. */ }
  }
  if (!ended) {
    await supabase.from('friend_calls').update({ ended_at: endedAt }).eq('id', callId).is('ended_at', null);
  }
  return true;
}

export const startFriendCall = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ friendIds: z.array(z.string().uuid()).min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const config = livekitConfig();
    if (!config) throw new Error('Le service audio privé n’est pas activé.');
    if (await findJoinedCall(context.supabase as unknown as CallClient, context.userId)) throw new Error(ALREADY_IN_CALL);
    const [callRes, profileRes] = await Promise.all([
      context.supabase.rpc('create_friend_call', { _friends: data.friendIds }),
      context.supabase.from('profiles').select('display_name').eq('id', context.userId).maybeSingle(),
    ]);
    if (callRes.error || !callRes.data) {
      throw new Error(callRes.error?.message ?? 'Impossible de démarrer l’appel.');
    }
    return issueCallToken(config, callRes.data, context.userId, profileRes.data?.display_name || 'Spectateur');
  });

export const joinFriendCall = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ callId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const config = livekitConfig();
    if (!config) throw new Error('Le service audio privé n’est pas activé.');
    if (await findJoinedCall(context.supabase as unknown as CallClient, context.userId, data.callId)) throw new Error(ALREADY_IN_CALL);
    const [callRes, memberRes, profileRes] = await Promise.all([
      context.supabase
        .from('friend_calls')
        .select('id,ended_at,expires_at')
        .eq('id', data.callId)
        .is('ended_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle(),
      context.supabase
        .from('friend_call_members')
        .select('state')
        .eq('call_id', data.callId)
        .eq('user_id', context.userId)
        .maybeSingle(),
      context.supabase.from('profiles').select('display_name').eq('id', context.userId).maybeSingle(),
    ]);
    if (callRes.error || !callRes.data || memberRes.error || !memberRes.data) {
      throw new Error('Appel introuvable ou terminé.');
    }
    const resp = await context.supabase.rpc('respond_friend_call', { _call: data.callId, _state: 'joined' });
    if (resp.error) throw new Error(resp.error.message);
    return issueCallToken(config, data.callId, context.userId, profileRes.data?.display_name || 'Spectateur');
  });

export const respondFriendCall = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ callId: z.string().uuid(), state: z.enum(['declined', 'left']) }).parse(input))
  .handler(async ({ data, context }) => {
    const resp = await context.supabase.rpc('respond_friend_call', { _call: data.callId, _state: data.state });
    if (resp.error) {
      // The call may already have been ended because the other participants left: that is not an error.
      const stillActive = await context.supabase
        .from('friend_calls')
        .select('id')
        .eq('id', data.callId)
        .is('ended_at', null)
        .maybeSingle();
      if (stillActive.data) throw new Error(resp.error.message);
      return { ok: true, ended: true };
    }
    const ended = await endCallIfTooSmall(context.supabase as unknown as CallClient, data.callId);
    return { ok: true, ended };
  });

export const addFriend = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(input => friendCodeSchema.parse(input)).handler(async ({ data, context }) => {
  const result = await context.supabase.rpc('request_friend', { _code: data });
  if (result.error) throw new Error(result.error.message);
  return { ok: true };
});

export const respondFriend = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(input => friendResponseSchema.parse(input)).handler(async ({ data, context }) => {
  const result = await context.supabase.rpc('respond_friend', { _id: data.id, _accept: data.accept });
  if (result.error) throw new Error('Impossible de modifier cette demande.');
  return { ok: true };
});