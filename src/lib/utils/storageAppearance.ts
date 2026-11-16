export const storageFinishes = [
  { id: 'white', name: 'Blanc', color: '#f1f0e9', grain: '' }, { id: 'ivory', name: 'Ivoire', color: '#e5decb', grain: '' },
  { id: 'sand', name: 'Sable', color: '#c8bda8', grain: '' }, { id: 'grey', name: 'Gris perle', color: '#babfba', grain: '' },
  { id: 'graphite', name: 'Graphite', color: '#45494a', grain: '' }, { id: 'black', name: 'Noir', color: '#252727', grain: '' },
  { id: 'green', name: 'Vert profond', color: '#203c31', grain: '' }, { id: 'navy', name: 'Bleu nuit', color: '#203440', grain: '' },
  { id: 'oak', name: 'Chêne naturel', color: '#bd9865', grain: 'wood' }, { id: 'light-oak', name: 'Chêne clair', color: '#d2ba8b', grain: 'wood' },
  { id: 'honey', name: 'Bois miel', color: '#b9804a', grain: 'wood' }, { id: 'ash', name: 'Frêne grisé', color: '#9a9783', grain: 'wood' },
  { id: 'walnut', name: 'Noyer', color: '#755640', grain: 'wood' }, { id: 'dark-walnut', name: 'Noyer foncé', color: '#533e30', grain: 'wood' },
  { id: 'bleached', name: 'Bois blanchi', color: '#d0cbb9', grain: 'wood' }, { id: 'concrete', name: 'Béton', color: '#93968d', grain: 'stone' },
] as const;
export type FinishId = typeof storageFinishes[number]['id'];
export type StorageAppearance = {
  carcass: FinishId; facades: FinishId; top: FinishId | 'same'; gloss: boolean;
  handle: 'bar' | 'knob' | 'integrated' | 'none'; handleColor: 'black' | 'inox' | 'gold';
  base: 'plinth' | 'feet' | 'wall'; back: boolean; sliding: boolean; led: boolean; softClose: boolean;
};
export const defaultStorageAppearance = (): StorageAppearance => ({ carcass: 'oak', facades: 'oak', top: 'same', gloss: false, handle: 'bar', handleColor: 'black', base: 'plinth', back: true, sliding: false, led: false, softClose: false });
export function storageFinish(id: string) { return storageFinishes.find(finish => finish.id === id) ?? storageFinishes[8]; }
export function finishBackground(id: string): string {
  const finish = storageFinish(id);
  return finish.grain === 'wood' ? `repeating-linear-gradient(90deg,${finish.color} 0px,${finish.color} 5px,#ffffff28 6px,#00000016 7px,${finish.color} 9px)` : finish.grain === 'stone' ? `radial-gradient(ellipse at 30% 40%,#ffffff33,transparent 45%),${finish.color}` : finish.color;
}
export function validateStorageAppearance(value: unknown): asserts value is StorageAppearance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Finitions du meuble invalides.');
  const item = value as Record<string, unknown>;
  for (const key of ['carcass','facades','top']) if (!(key === 'top' && item[key] === 'same') && !storageFinishes.some(finish => finish.id === item[key])) throw new Error('Finition inconnue.');
  const choices = { handle: ['bar','knob','integrated','none'], handleColor: ['black','inox','gold'], base: ['plinth','feet','wall'] };
  for (const [key, allowed] of Object.entries(choices)) if (!allowed.includes(item[key] as string)) throw new Error('Option de meuble invalide.');
  for (const key of ['gloss','back','sliding','led','softClose']) if (typeof item[key] !== 'boolean') throw new Error('Option de meuble invalide.');
}
export function storageAppearanceSummary(value: StorageAppearance): string {
  const handle = { bar: 'Barre', knob: 'Bouton', integrated: 'Prise intégrée', none: 'Sans poignée' };
  const base = { plinth: 'Socle', feet: 'Pieds', wall: 'Suspendu' };
  return `Caisson : ${storageFinish(value.carcass).name} ; façades : ${storageFinish(value.facades).name} (${value.gloss ? 'brillant' : 'mat'}) ; dessus : ${value.top === 'same' ? 'comme le caisson' : storageFinish(value.top).name} ; poignées : ${handle[value.handle]} (${value.handleColor}) ; base : ${base[value.base]} ; fond : ${value.back ? 'oui' : 'non'} ; portes coulissantes : ${value.sliding ? 'oui' : 'non'} ; LED : ${value.led ? 'oui' : 'non'} ; fermeture douce : ${value.softClose ? 'oui' : 'non'}`;
}
