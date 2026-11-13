DROP POLICY profile_friend_read ON public.profiles;
DROP POLICY profile_call_peer_read ON public.profiles;
CREATE FUNCTION public.friend_peer_profiles() RETURNS TABLE(id uuid,display_name text,avatar_url text,friend_code text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.id,p.display_name,p.avatar_url,p.friend_code FROM public.profiles p WHERE EXISTS(SELECT 1 FROM public.friendships f WHERE (f.requester_id=auth.uid() AND f.recipient_id=p.id) OR (f.recipient_id=auth.uid() AND f.requester_id=p.id)) $$;
REVOKE ALL ON FUNCTION public.friend_peer_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.friend_peer_profiles() TO authenticated;