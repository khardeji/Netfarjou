import { i18n } from './i18n';
import horizon from '@/assets/horizon-poster.jpg';
import minuit from '@/assets/minuit-poster.jpg';
import sommets from '@/assets/sommets-poster.jpg';

export const posters: Record<string, string> = { horizon, minuit, sommets };
export const statusLabels: Record<string, string> = { Upcoming: 'Prochainement', 'Registration Open': 'Inscriptions ouvertes', 'Waiting Room': 'Salon ouvert', Live: 'En direct', Finished: 'Terminée', Cancelled: 'Annulée' };
export function statusLabel(status: string) { return statusLabels[status] ?? status; }
export function formatDate(value: string) { return new Intl.DateTimeFormat(i18n.language === 'ar-TN' ? 'ar-TN' : i18n.language === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
export function canRegister(status: string, opens: string, closes: string, _count = 0, _capacity = 0, now = Date.now()) { return status === 'Registration Open' && now >= Date.parse(opens) && now < Date.parse(closes); }
export function headMeta(title: string, description: string) { return { meta: [{ title: `${title} · Netfarjou` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} · Netfarjou` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }; }