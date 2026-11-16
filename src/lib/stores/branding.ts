import { writable } from 'svelte/store';

export type Branding = { companyName: string; logoUrl: string; logoLink: string; shopLink: string };
export const defaultBranding: Branding = { companyName: 'CSM Taksit', logoUrl: '/branding/csm-taksit-logo.png', logoLink: 'https://csmtaksit.dz', shopLink: 'https://eshop.csmtaksit.dz/' };
export const branding = writable<Branding>({ ...defaultBranding });
export async function loadBranding(): Promise<void> {
  try {
    const response = await fetch('/api/branding.php', { cache: 'no-store' });
    if (!response.ok) throw new Error('Identité indisponible');
    const payload = await response.json();
    if (payload.branding) branding.set(payload.branding);
  } catch (error) { console.warn('Identité par défaut conservée.', error); }
}
