import { afterEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { locale, translateUi } from '../src/lib/i18n';
import { creationAr, creationEn, creationFr } from '../src/lib/i18n/creationMessages';

afterEach(() => { vi.unstubAllGlobals(); locale.set('fr'); });
describe('CSM languages', () => {
  it('provides matching nonempty configurator messages in all three languages', () => {
    for (const dictionary of [creationAr, creationEn]) {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(creationFr).sort());
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim()).not.toBe('');
        expect(value.match(/\{\w+\}/g) ?? []).toEqual(creationFr[key as keyof typeof creationFr].match(/\{\w+\}/g) ?? []);
      }
    }
    expect(translateUi('ar', 'Mes projets')).toBe('مشاريعي');
    expect(translateUi('en', 'Mes projets')).toBe('My projects');
  });
  it('sets and persists Arabic RTL and restores English LTR', () => {
    const root = {lang:'', dir:''}; const setItem=vi.fn();
    vi.stubGlobal('document', {documentElement:root});
    vi.stubGlobal('localStorage', {setItem});
    locale.set('ar'); expect(root).toEqual({lang:'ar',dir:'rtl'});
    expect(setItem).toHaveBeenCalledWith('o3d_locale','ar');
    locale.set('pt'); expect(get(locale)).toBe('ar');
    locale.set('en'); expect(root).toEqual({lang:'en',dir:'ltr'});
  });
});
