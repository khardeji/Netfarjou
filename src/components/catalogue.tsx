import { t } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { useSuspenseQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Plus, Search, SlidersHorizontal, Ticket, Radio } from 'lucide-react';
import { catalogueOptions } from '@/lib/cinema.queries';
import { isMatchGenre } from '@/lib/cinema';
import { supabase } from '@/integrations/supabase/client';
import { MovieCard } from './movie-card';
import { Button } from './ui/button';
import { useAuth } from './auth-context';
export function Catalogue({ compact = false }: {
    compact?: boolean;
}) {
 useTranslation();
    const { data: sessions } = useSuspenseQuery(catalogueOptions);
    const { user } = useAuth();
    const cache = useQueryClient();
    const [filter, setFilter] = useState('Toutes les séances');
    const [search, setSearch] = useState('');
    const [genre, setGenre] = useState('Tous les genres');
    const mine = useQuery({ queryKey: ['my-sessions', user?.id], enabled: !!user, queryFn: async () => { const { data, error } = await supabase.from('participants').select('screening_id').eq('user_id', user?.id ?? ''); if (error)
            throw error; return data; } });
    useEffect(() => { const channel = supabase.channel(`catalogue-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'screenings' }, () => cache.invalidateQueries({ queryKey: ['catalogue'] })).on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => { cache.invalidateQueries({ queryKey: ['catalogue'] }); cache.invalidateQueries({ queryKey: ['my-sessions'] }); }).subscribe(); return () => { supabase.removeChannel(channel); }; }, [cache]);
    const list = sessions.filter(s => (!compact || !isMatchGenre(s.movies?.genre)) && s.movies?.title.toLowerCase().includes(search.toLowerCase()) && (genre === 'Tous les genres' || s.movies?.genre === genre) && (filter === 'Toutes les séances' ? s.status !== 'Cancelled' : filter === 'Disponibles' ? s.status === 'Registration Open' : filter === 'Prochainement' ? s.status === 'Upcoming' : filter === 'En direct' ? s.status === 'Live' : s.status === 'Finished'));
    return <section className="catalogue-section content-width"><div className="section-heading"><div><div className="section-kicker">{t("LE PROGRAMME")}</div><h2>{compact ? t("S\u00E9ances disponibles") : t("Toutes les s\u00E9ances")}<span className="heading-dot">.</span></h2><p>{t("De belles histoires. Encore meilleures ensemble.")}</p></div>{compact && <Button variant="ghost" asChild><Link to="/seances">{t("Voir tout le programme")}<ArrowRight /></Link></Button>}</div><div className="catalogue-toolbar"><div className="filter-tabs">{['Toutes les séances', 'Disponibles', 'Prochainement', 'En direct', 'Terminées'].map(f => <Button variant="ghost" key={f} className={filter === f ? 'filter-active' : ''} onClick={() => setFilter(f)}>{f === 'En direct' && <Radio size={14}/>} {t(f)}</Button>)}</div><div className="catalogue-search"><label><Search size={16}/><input aria-label={t("Rechercher un titre")} placeholder={t("Rechercher un film")} value={search} onChange={e => setSearch(e.target.value)}/></label><label className="genre-selector"><SlidersHorizontal size={14}/><select aria-label={t("Genre")} value={genre} onChange={e => setGenre(e.target.value)}><option value="Tous les genres">{t("Tous les genres")}</option>{[...new Set(sessions.map(s => s.movies?.genre).filter(Boolean))].map(g => <option key={g} value={g}>{t(g ?? "")} </option>)}</select></label></div></div><div className="movie-grid">{list.map(session => <MovieCard key={session.id} session={session} registered={mine.data?.some(m => m.screening_id === session.id) ?? false}/>)}{compact && <div className="community-card"><span className="community-icon"><Ticket size={28}/></span><span className="section-kicker">{t("\u00C0 VOUS DE CHOISIR")}</span><h3>{t("Et si le prochain film, c\u2019\u00E9tait le v\u00F4tre ?")}</h3><p>{t("Partagez vos coups de c\u0153ur avec la communaut\u00E9.")}</p><Button variant="outline" asChild><Link to="/propositions"><Plus />{t("Proposer un film")}</Link></Button><span className="community-bottom">{t("Le cin\u00E9ma se partage.")}</span></div>}</div>{!list.length && <div className="empty-state"><FilmEmpty /><h3>{t("Aucune s\u00E9ance pour le moment")}</h3><p>{t("Revenez bient\u00F4t pour d\u00E9couvrir la prochaine programmation.")}</p><Button variant="link" onClick={() => { setFilter('Toutes les séances'); setSearch(''); setGenre('Tous les genres'); }}>{t("Voir toutes les s\u00E9ances")}</Button></div>}</section>;
}
function FilmEmpty() { return <Ticket size={32} className="text-muted-foreground"/>; }
