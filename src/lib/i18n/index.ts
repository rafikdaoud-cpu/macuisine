import { derived, writable } from 'svelte/store';
import { en } from './locales/en';
import { ar } from './locales/ar';
import { fr } from './locales/fr';
import { pt } from './locales/pt';

// Portuguese remains readable for legacy file/export helpers, but cannot be selected in the application.
export type Locale = 'en' | 'ar' | 'fr' | 'pt';
export type TranslationKey = keyof typeof en;
const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, ar, fr, pt:{...en,...pt} };
const preference = writable<Locale>('fr');
const isLocale = (value: unknown): value is Locale => value === 'en' || value === 'ar' || value === 'fr';

export function translate(language: Locale, key: TranslationKey, variables: Record<string, string | number> = {}): string {
  // Single-pass substitution preserves literal braces in user-provided values.
  return dictionaries[language][key].replace(/\{(\w+)\}/g, (token, name) =>
    Object.hasOwn(variables, name) ? String(variables[name]) : token);
}

export const locale = {
  subscribe: preference.subscribe,
  set(value: Locale) {
    if (!isLocale(value)) return;
    preference.set(value);
    if (typeof document !== 'undefined') { document.documentElement.lang = value; document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr'; }
    try { localStorage.setItem('o3d_locale', value); } catch { /* In-memory choice still works. */ }
  },
};

/** Restore the saved language after hydration; French is the default. */
export function initializeLocale() {
  let saved: unknown;
  try { saved = localStorage.getItem('o3d_locale'); } catch { /* Storage can be disabled. */ }
  let migrated = false;
  try { migrated = localStorage.getItem('o3d_locale_fr_migrated') === '1'; } catch { /* Storage can be disabled. */ }
  // Existing English was the former default. Move it to French once; later choices remain respected.
  const selected = !migrated && (!isLocale(saved) || saved === 'en') ? 'fr' : isLocale(saved) ? saved : 'fr';
  locale.set(selected);
  try { localStorage.setItem('o3d_locale_fr_migrated', '1'); } catch { /* In-memory locale still works. */ }
}

/** Svelte's $t subscription updates labels without remounting dialogs or inputs. */
export const t = derived(preference, (language) =>
  (key: TranslationKey, variables?: Record<string, string | number>) => translate(language, key, variables));

/** Source labels from the configurator use the same locale dictionaries as the editor. */
export function translateUi(language: Locale, source: string):string { return dictionaries[language][(`creation.${source}`) as TranslationKey] ?? source; }
export const ui = derived(preference, language => (source:string) => translateUi(language,source));
