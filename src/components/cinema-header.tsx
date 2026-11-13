import { BrandLogo } from './brand-logo';
import { Globe } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { i18n, syncLanguage, resolveLanguage } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, LogOut, Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './auth-context';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
export function CinemaHeader() {
 useTranslation();
    const { user, admin } = useAuth();
    const navigate = useNavigate();
    const router = useRouter();
    const cache = useQueryClient();
    const [menu, setMenu] = useState(false);
    const notifications = useQuery({ queryKey: ['notifications', user?.id], enabled: !!user, queryFn: async () => { const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20); if (error)
            throw error; return data; } });
    async function logout() { await cache.cancelQueries(); cache.clear(); await supabase.auth.signOut(); await navigate({ to: '/auth', replace: true }); }
    return <header className="cinema-header"><div className="header-inner"><Link to="/" className="wordmark"><BrandLogo /></Link><nav className={menu ? 'main-nav menu-open' : 'main-nav'} aria-label={t("Navigation principale")}><Link to="/" activeOptions={{ exact: true }} onClick={() => setMenu(false)}>{t("D\u00E9couvrir")}</Link><Link to="/seances" onClick={() => setMenu(false)}>{t("Les s\u00E9ances")}</Link><Link to="/matchs" onClick={() => setMenu(false)}>{t("Matchs Live")}</Link><Link to="/mes-seances" onClick={() => setMenu(false)}>{t("Mes s\u00E9ances")}</Link><Link to="/propositions" onClick={() => setMenu(false)}>{t("La communaut\u00E9")}</Link>{admin && <Link to="/admin">{t("Administration")}</Link>}</nav><div className="header-actions"><Select value={i18n.language} onValueChange={value => syncLanguage(resolveLanguage(value))}><SelectTrigger className="language-select" aria-label="Language / Langue / اللغة"><Globe size={14}/><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fr">Français</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="ar-TN">تونسي</SelectItem></SelectContent></Select><Button variant="ghost" size="icon" title={t("Rechercher un film")} aria-label={t("Rechercher un film")} onClick={() => navigate({ to: '/seances' })}><Search /></Button>{user ? <><Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" title={t("Notifications")} aria-label={t("Notifications")}><Bell />{notifications.data?.some(n => !n.read) && <span className="notification-dot"/>}</Button></PopoverTrigger><PopoverContent><h3 className="font-semibold mb-3">{t("Notifications")}</h3>{notifications.error ? <p className="text-sm text-muted-foreground">{t("Impossible de charger les notifications.")}</p> : notifications.data?.length ? notifications.data.map(n => <div key={n.id} className="notification-item"><p>{n.message}</p>{!n.read && <Button variant="link" size="sm" onClick={async () => { await supabase.from('notifications').update({ read: true }).eq('id', n.id); cache.invalidateQueries({ queryKey: ['notifications'] }); }}>{t("Marquer comme lue")}</Button>}</div>) : <p className="text-sm text-muted-foreground">{t("Vous \u00EAtes \u00E0 jour.")}</p>}</PopoverContent></Popover><Popover><PopoverTrigger asChild><Button variant="secondary" size="icon" className="account-avatar" aria-label={t("Mon compte")}>{(user.user_metadata['display_name'] ?? user.email ?? 'S').slice(0, 1).toUpperCase()}</Button></PopoverTrigger><PopoverContent><p className="font-semibold">{user.user_metadata['display_name'] ?? 'Mon compte'}</p><Button variant="ghost" className="mt-3 w-full justify-start" asChild><Link to="/profil">{t('Mon profil et amis')}</Link></Button><Button variant="ghost" className="mt-3" onClick={logout}><LogOut />{t("Se d\u00E9connecter")}</Button></PopoverContent></Popover></> : <Button variant="outline" asChild><Link to="/auth">{t("Se connecter")}</Link></Button>}<Button variant="ghost" size="icon" className="mobile-menu" aria-label={t("Menu")} onClick={() => { setMenu(!menu); router.invalidate(); }}>{menu ? <X /> : <Menu />}</Button></div></div></header>;
}
