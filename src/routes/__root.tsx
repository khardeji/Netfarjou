import { BrandLogo } from '@/components/brand-logo';
import { t, i18n, resolveLanguage, syncLanguage } from '@/lib/i18n';
import { I18nextProvider } from 'react-i18next';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps, } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { ensureProfile } from '@/lib/cinema.functions';
import { AuthContext } from '@/components/auth-context';
import { CinemaHeader } from '@/components/cinema-header';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
function NotFoundComponent() {
 useTranslation();
    return (<div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("Page not found")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("The page you're looking for doesn't exist or has been moved.")}</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">{t("Go home")}</Link>
        </div>
      </div>
    </div>);
}
function ErrorComponent({ error, reset }: ErrorComponentProps) {
 useTranslation();
    console.error(error);
    const router = useRouter();
    useEffect(() => {
        reportLovableError(error, { boundary: "tanstack_root_error_component" });
    }, [error]);
    return (<div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("This page didn't load")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("Something went wrong on our end. You can try refreshing or head back home.")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => {
            router.invalidate();
            reset();
        }}>{t("Try again")}</Button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">{t("Go home")}</a>
        </div>
      </div>
    </div>);
}
export const Route = createRootRouteWithContext<{
    queryClient: QueryClient;
}>()({
    head: () => ({
        // Replace these placeholders with the app's name and description when first building the app.
        // Each content route, / included, must still set its own head(). Never add og:image or
        // twitter:image here: every page without its own would inherit the root's preview image.
        meta: [
            { charSet: "utf-8" },
            { name: "viewport", content: "width=device-width, initial-scale=1" },
            { title: "Netfarjou · Le cinéma, ensemble" },
            { name: "description", content: "Votre cinéma en ligne, à partager ensemble." },
            { property: "og:title", content: "Netfarjou · Le cinéma, ensemble" },
            { property: "og:description", content: "Votre cinéma en ligne, à partager ensemble." },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
            { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
            { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
            { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
            { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=DM+Sans:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap' },
        ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
});
function RootShell({ children }: {
    children: ReactNode;
}) {
    return (<html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>);
}
function RootComponent() {
 useTranslation();
    useEffect(() => { let saved: string | null = null; try { saved = localStorage.getItem('netfarjou-language'); } catch { /* Storage optional. */ } syncLanguage(resolveLanguage(saved)); }, []);
    const { queryClient } = Route.useRouteContext();
    const router = useRouter();
    const [auth, setAuth] = useState<{
        user: User | null;
        admin: boolean;
        loading: boolean;
    }>({ user: null, admin: false, loading: true });
    useEffect(() => {
        let active = true;
        let version = 0;
        async function refresh() { const current = ++version; const { data } = await supabase.auth.getUser(); let admin = false; if (data.user) {
            void ensureProfile().catch(() => {});
            const role = await supabase.rpc('has_role', { _user_id: data.user.id, _role: 'admin' });
            admin = role.data === true;
        } if (active && current === version)
            setAuth({ user: data.user, admin, loading: false }); }
        let sessionOnlyExpired = false;
        try {
            sessionOnlyExpired = localStorage.getItem('netfarjou-remember-me') === 'false' && !sessionStorage.getItem('netfarjou-session-only');
        } catch { /* Storage optional. */ }
        if (sessionOnlyExpired) {
            void supabase.auth.signOut().then(() => {
                try { localStorage.removeItem('netfarjou-remember-me'); } catch { /* Storage optional. */ }
                if (active) setAuth({ user: null, admin: false, loading: false });
            });
        } else {
            refresh();
        }
        const { data: listener } = supabase.auth.onAuthStateChange(event => { if (!['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event))
            return; setTimeout(() => { refresh(); router.invalidate(); if (event !== 'SIGNED_OUT')
            queryClient.invalidateQueries(); }, 0); });
        return () => { active = false; listener.subscription.unsubscribe(); };
    }, [router, queryClient]);
    return (<I18nextProvider i18n={i18n}><QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <CinemaHeader />
        <Outlet />
        <footer className="site-footer content-width"><Link to="/" className="footer-brand"><BrandLogo /></Link><div className="footer-details"><span>{t("Le cin\u00E9ma, ensemble.")}</span><span>© 2026 Netfarjou</span></div></footer>
        <Toaster theme="dark" richColors/>
      </AuthContext.Provider>
    </QueryClientProvider></I18nextProvider>);
}
