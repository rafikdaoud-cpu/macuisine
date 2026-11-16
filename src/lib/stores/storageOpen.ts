import { writable } from 'svelte/store';

/** Preview state, deliberately independent of the saved furniture dimensions. */
export const storageOpen = writable(false);
