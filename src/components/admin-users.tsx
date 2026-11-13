import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import { canChangeAdminRole } from '@/lib/admin-rules';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from './auth-context';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
type Profile = Database['public']['Tables']['profiles']['Row'];
export function AdminUsers({ profiles, roles, refresh }: { profiles: Profile[]; roles: { user_id: string; role: string }[]; refresh: () => void }) {
  useTranslation(); const { user } = useAuth(); const [editing, setEditing] = useState<Profile | null>(null); const [busy, setBusy] = useState(false);
  const count = roles.filter(role => role.role === 'admin').length;
  async function role(id: string, admin: boolean) {
    if (!user || !canChangeAdminRole(user.id, id, admin, count)) return;
    setBusy(true); const result = await supabase.rpc('set_user_admin', { _user_id: id, _admin: admin }); setBusy(false);
    if (result.error) toast.error(result.error.message); else { toast.success(t('Rôle mis à jour.')); refresh(); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; const form = new FormData(event.currentTarget); setBusy(true);
    const result = await supabase.from('profiles').update({ display_name: String(form.get('name')).trim() }).eq('id', editing.id); setBusy(false);
    if (result.error) toast.error(result.error.message); else { toast.success(t('Utilisateur enregistré.')); setEditing(null); refresh(); }
  }
  return <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{t('NOM')}</th><th>{t('Rôle')}</th><th>{t('ACTIONS')}</th></tr></thead><tbody>{profiles.map(profile => {
    const admin = roles.some(role => role.user_id === profile.id && role.role === 'admin');
    return <tr key={profile.id}><td>{profile.display_name || t('Membre')}</td><td><select aria-label={`${t('Rôle')} ${profile.display_name}`} value={admin ? 'admin' : 'user'} disabled={busy || (admin && (!user || !canChangeAdminRole(user.id, profile.id, false, count)))} onChange={event => role(profile.id, event.target.value === 'admin')}><option value="user">{t('Membre')}</option><option value="admin">{t('Administrateur')}</option></select></td><td><Button variant="ghost" size="icon" aria-label={t('Modifier')} title={t('Modifier')} onClick={() => setEditing(profile)}><Pencil/></Button></td></tr>;
  })}</tbody></table></div><Dialog open={!!editing} onOpenChange={() => setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{t('Modifier')}</DialogTitle><DialogDescription>{t('Nom affiché')}</DialogDescription></DialogHeader><form onSubmit={save}><label className="field">{t('Nom affiché')}<input name="name" defaultValue={editing?.display_name} required maxLength={100}/></label><Button type="submit" disabled={busy}>{t('Enregistrer')}</Button></form></DialogContent></Dialog></>;
}