import { t } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-context';
import { Button } from '@/components/ui/button';
import { MovieCard } from '@/components/movie-card';
import { catalogueOptions } from '@/lib/cinema.queries';
import { headMeta } from '@/lib/cinema';
import { supabase } from '@/integrations/supabase/client';
export const Route = createFileRoute('/mes-seances')({ head: () => headMeta('Mes séances', 'Retrouvez vos réservations et vos prochaines séances de cinéma sur Netfarjou.'), loader: ({ context }) => context.queryClient.ensureQueryData(catalogueOptions), component: MySessions });
function MySessions() {
 useTranslation(); const { user, loading } = useAuth(); const { data: sessions } = useSuspenseQuery(catalogueOptions); const mine = useQuery({ queryKey: ['my-sessions', user?.id], enabled: !!user, queryFn: async () => { const { data, error } = await supabase.from('participants').select('screening_id').eq('user_id', user?.id ?? ''); if (error)
        throw error; return data; } }); const list = sessions.filter(s => mine.data?.some(p => p.screening_id === s.id)); return <main className="content-width standard-page"><div className="page-heading"><div className="section-kicker">{t("VOTRE AGENDA CIN\u00C9MA")}</div><h1>{t("Mes s\u00E9ances")}<span className="heading-dot">.</span></h1><p>{t("Vos places r\u00E9serv\u00E9es, vos prochaines \u00E9motions.")}</p></div>{loading || mine.isLoading ? <div className="empty-state">{t("Chargement de vos r\u00E9servations\u2026")}</div> : !user ? <div className="empty-state"><h3>{t("Retrouvez vos r\u00E9servations")}</h3><Button asChild><Link to="/auth">{t("Se connecter")}</Link></Button></div> : mine.error ? <div className="empty-state">{t("Impossible de charger vos r\u00E9servations.")}</div> : list.length ? <div className="movie-grid py-8">{list.map(s => <MovieCard key={s.id} session={s} registered/>)}</div> : <div className="empty-state"><h3>{t("Votre prochaine histoire vous attend.")}</h3><p>{t("Vous n\u2019avez pas encore r\u00E9serv\u00E9 de s\u00E9ance.")}</p><Button asChild><Link to="/seances">{t("Explorer les s\u00E9ances")}</Link></Button></div>}</main>; }
