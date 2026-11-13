import { t } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { catalogueOptions } from '@/lib/cinema.queries';
import { headMeta } from '@/lib/cinema';
import { Catalogue } from '@/components/catalogue';
import { FilmHero } from '@/components/film-hero';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/')({ head: () => headMeta('Le cinéma, ensemble', 'Découvrez Netfarjou, votre cinéma en ligne. Réservez une séance et partagez les films avec la communauté.'), loader: ({ context }) => context.queryClient.ensureQueryData(catalogueOptions), component: Index });
function Index() {
 useTranslation(); const { data } = useSuspenseQuery(catalogueOptions); return <main><FilmHero sessions={data}/><Catalogue compact/><section className="community-band"><div className="content-width community-band-inner"><div><div className="band-eyebrow">{t("L\u2019\u00C9MOTION EST COLLECTIVE")}</div><h2>{t("Des kilom\u00E8tres entre nous. Un m\u00EAme grand \u00E9cran.")}</h2><p>{t("Retrouvez la communaut\u00E9 pour votre prochain rendez-vous cin\u00E9ma.")}</p></div><Button variant="outline" asChild><Link to="/propositions">{t("Rejoindre la communaut\u00E9")}<ArrowRight /></Link></Button></div></section></main>; }
