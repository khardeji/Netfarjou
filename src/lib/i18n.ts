import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './translations';

export const languages = ['fr', 'en', 'ar-TN'] as const;
export type Language = typeof languages[number];
export function resolveLanguage(value: string | null): Language { return languages.find(language => language === value) ?? 'fr'; }
export function languageDirection(language: string) { return language === 'ar-TN' ? 'rtl' : 'ltr'; }
export const i18n = i18next.createInstance();
void i18n.use(initReactI18next).init({ resources: translations, lng: 'fr', fallbackLng: 'fr', keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false }, react: { useSuspense: false } });
export const t = (text: string) => String(i18n.t(text));
export function syncLanguage(language: Language) {
  void i18n.changeLanguage(language);
  document.documentElement.lang = language;
  document.documentElement.dir = languageDirection(language);
  try { localStorage.setItem('netfarjou-language', language); } catch { /* Storage is optional. */ }
}