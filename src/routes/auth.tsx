import { t } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { headMeta } from '@/lib/cinema';
export const Route = createFileRoute('/auth')({ head: () => headMeta('Connexion', 'Connectez-vous à Netfarjou et réservez votre prochaine séance de cinéma.'), component: AuthPage });
function AuthPage() {
 useTranslation();
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);
    const [remember, setRemember] = useState(true);
    const [savedEmail, setSavedEmail] = useState('');
    const navigate = useNavigate();
    useEffect(() => {
        try {
            const pref = localStorage.getItem('netfarjou-remember-me');
            if (pref === 'false') setRemember(false);
            const mail = localStorage.getItem('netfarjou-remembered-email');
            if (mail) setSavedEmail(mail);
        } catch { /* Storage optional. */ }
    }, []);
    async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const form = new FormData(e.currentTarget); const email = String(form.get('email')); const password = String(form.get('password')); setBusy(true); setError(''); try {
        if (mode === 'signup') {
            const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: String(form.get('name')) } } });
            if (error)
                throw error;
            setSuccess('Consultez votre boîte e-mail pour confirmer votre compte, puis connectez-vous.');
        }
        else if (mode === 'forgot') {
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
            if (error)
                throw error;
            setSuccess('Si ce compte existe, un lien de réinitialisation vous a été envoyé.');
        }
        else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error)
                throw error;
            try {
                localStorage.setItem('netfarjou-remember-me', remember ? 'true' : 'false');
                if (remember) {
                    localStorage.setItem('netfarjou-remembered-email', email);
                    sessionStorage.removeItem('netfarjou-session-only');
                } else {
                    localStorage.removeItem('netfarjou-remembered-email');
                    sessionStorage.setItem('netfarjou-session-only', '1');
                }
            } catch { /* Storage optional. */ }
            await navigate({ to: '/' });
        }
    }
    catch (err) {
        setError(err instanceof Error ? err.message : t("Impossible de vous connecter."));
    }
    finally {
        setBusy(false);
    } }
    return <main className="auth-page"><div className="auth-panel"><div className="section-kicker">{t("VOTRE PLACE VOUS ATTEND")}</div><h1>{mode === 'signup' ? t("Le cin\u00E9ma nous r\u00E9unit.") : mode === 'forgot' ? t("Un nouveau d\u00E9part.") : t("Content de vous revoir.")}</h1><p>{mode === 'signup' ? t("Cr\u00E9ez votre compte et partagez vos prochaines \u00E9motions de cin\u00E9ma.") : mode === 'forgot' ? t("Recevez un lien pour choisir un nouveau mot de passe.") : t("Connectez-vous pour retrouver vos s\u00E9ances et la communaut\u00E9.")}</p>{success ? <div className="form-success">{success}</div> : <form onSubmit={submit}>{mode === 'signup' && <label className="field">{t("Votre nom")}<input name="name" required autoComplete="name" placeholder={t("Comment vous appeler ?")}/></label>}<label className="field">{t("Adresse e-mail")}<input key={savedEmail} type="email" name="email" defaultValue={savedEmail} required autoComplete="email" placeholder="vous@exemple.fr"/></label>{mode !== 'forgot' && <label className="field">{t("Mot de passe")}<input type="password" name="password" required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={t("Au moins 8 caract\u00E8res")}/></label>}{mode === 'login' && <label className="flex items-center gap-2 text-xs text-muted-foreground mb-4 cursor-pointer select-none"><Checkbox checked={remember} onCheckedChange={v => setRemember(v === true)}/><span>{t("Se souvenir de moi")}</span></label>}{error && <div className="form-error" role="alert">{error}</div>}<Button disabled={busy} type="submit">{busy ? t("Un instant\u2026") : mode === 'signup' ? t("Cr\u00E9er mon compte") : mode === 'forgot' ? t("Envoyer le lien") : t("Se connecter")}</Button></form>}{mode === 'login' && <Button variant="link" className="w-full mt-3 text-xs" onClick={() => { setMode('forgot'); setSuccess(''); setError(''); }}>{t("Mot de passe oubli\u00E9 ?")}</Button>}<div className="auth-switch">{mode === 'login' ? t("Pas encore de compte ?") : t("D\u00E9j\u00E0 un compte ?")}<Button variant="link" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setSuccess(''); setError(''); }}>{mode === 'login' ? t("S\u2019inscrire") : t("Se connecter")}</Button></div></div></main>;
}
