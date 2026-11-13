import { t } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { headMeta } from '@/lib/cinema';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/reset-password')({ head: () => headMeta('Nouveau mot de passe', 'Choisissez un nouveau mot de passe pour votre compte Netfarjou.'), component: Reset });
function Reset() {
 useTranslation(); const [valid, setValid] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); useEffect(() => { setValid(new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery'); }, []); async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const form = new FormData(e.currentTarget); if (form.get('password') !== form.get('confirm')) {
    setMessage('Les mots de passe ne correspondent pas.');
    return;
} setBusy(true); const { error } = await supabase.auth.updateUser({ password: String(form.get('password')) }); setBusy(false); setMessage(error ? error.message : t("Votre mot de passe a \u00E9t\u00E9 modifi\u00E9.")); } return <main className="auth-page"><div className="auth-panel"><h1>{t("Nouveau mot de passe")}</h1>{valid ? <form onSubmit={submit}><label className="field">{t("Mot de passe")}<input name="password" type="password" minLength={8} required/></label><label className="field">{t("Confirmer")}<input name="confirm" type="password" minLength={8} required/></label><Button disabled={busy}>{t("Enregistrer")}</Button></form> : <p>{t("Ouvrez le lien re\u00E7u par e-mail pour r\u00E9initialiser votre mot de passe.")}</p>}{message && <p className="form-error" role="status">{message}</p>}</div></main>; }
