import { describe, expect, it } from 'vitest';
import { canChangeAdminRole } from '@/lib/admin-rules';
import { resolveLanguage, languageDirection } from '@/lib/i18n';
describe('administration sécurisée', () => {
  it('interdit de retirer son propre accès', () => expect(canChangeAdminRole('owner', 'owner', false, 2)).toBe(false));
  it('préserve le dernier administrateur', () => expect(canChangeAdminRole('owner', 'other', false, 1)).toBe(false));
  it('permet de promouvoir un membre', () => expect(canChangeAdminRole('owner', 'other', true, 1)).toBe(true));
});
describe('langues Netfarjou', () => {
  it('accepte français, anglais et arabe tunisien', () => { for (const language of ['fr', 'en', 'ar-TN']) expect(resolveLanguage(language)).toBe(language); });
  it('utilise la lecture droite à gauche uniquement en arabe tunisien', () => { expect(languageDirection('ar-TN')).toBe('rtl'); expect(languageDirection('en')).toBe('ltr'); expect(languageDirection('fr')).toBe('ltr'); });
});