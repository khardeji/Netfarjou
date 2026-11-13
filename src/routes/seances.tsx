import { t } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { Catalogue } from '@/components/catalogue';
import { catalogueOptions } from '@/lib/cinema.queries';
import { headMeta } from '@/lib/cinema';
export const Route = createFileRoute('/seances')({ head: () => headMeta('Les séances', 'Découvrez la programmation Netfarjou et réservez votre place pour une séance partagée.'), loader: ({ context }) => context.queryClient.ensureQueryData(catalogueOptions), component: () => <main className="standard-page"><div className="page-heading content-width"><div className="section-kicker">{t("LE CIN\u00C9MA, ENSEMBLE")}</div><h1>{t("Votre prochaine s\u00E9ance.")}</h1></div><Catalogue /></main> });
