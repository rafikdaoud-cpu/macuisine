import { writable } from 'svelte/store';

/** Presentation only; switching views never rewrites saved project geometry. */
export const furnitureFrontView = writable(false);
