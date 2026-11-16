import { writable } from 'svelte/store';

export type Branding = { companyName: string; logoUrl: string; logoLink: string; shopLink: string; phone: string; contactEmail: string; website: string; primaryColor: string };
export const defaultBranding: Branding = { companyName: 'Mon entreprise', logoUrl: '/branding/platform-logo.svg', logoLink: '', shopLink: '', phone: '', contactEmail: '', website: '', primaryColor: '#1e2447' };
export const branding = writable<Branding>({ ...defaultBranding });
export async function loadBranding(): Promise<void> {
  try {
    const response = await fetch('/api/branding.php', { cache: 'no-store' });
    if (!response.ok) throw new Error('Identité indisponible');
    const payload = await response.json();
    if (payload.branding) branding.set({ ...defaultBranding, ...payload.branding });
  } catch (error) { console.warn('Identité par défaut conservée.', error); }
}
