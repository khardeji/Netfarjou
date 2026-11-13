import { t } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { AdminDashboard } from '@/components/admin-dashboard';
import { adminOptions } from '@/lib/cinema.queries';
import { headMeta } from '@/lib/cinema';
export const Route = createFileRoute('/_authenticated/admin')({ head: () => headMeta('Administration', 'Gestion des films, de la programmation et des participants Netfarjou.'), loader: ({ context }) => context.queryClient.ensureQueryData(adminOptions), component: AdminDashboard, errorComponent: () => <main className="empty-state standard-page"><h1>{t("Acc\u00E8s r\u00E9serv\u00E9")}</h1><p>{t("Un compte administrateur est n\u00E9cessaire pour acc\u00E9der \u00E0 cet espace.")}</p></main> });
