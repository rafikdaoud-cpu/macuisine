import type { FurnitureItem, Project } from '$lib/models/types';
import { createDefaultProject } from '$lib/stores/project';
import { createKitchenProject, type KitchenSetup } from './kitchenWorkflow';
import { validateStorageAppearance, type StorageAppearance } from './storageAppearance';

export type CreationKind = 'kitchen' | 'dressing' | 'furniture';
export type StorageColumn = { type: 'shelves' | 'hanging' | 'drawers'; count: number; doors: boolean };
export type StorageSetup = {
  kind: 'dressing' | 'furniture'; name: string;
  widthMm: number; depthMm: number; heightMm: number; color: string;
  columns: StorageColumn[];
  appearance?: StorageAppearance;
};
export type CreationSetup = { kind: 'kitchen'; kitchen: KitchenSetup; appearance?: StorageAppearance } | StorageSetup;
export const creationLabels: Record<CreationKind, string> = {
  kitchen: 'Cuisine', dressing: 'Dressing', furniture: 'Meuble sur mesure',
};
export const storageColors = [
  { name: 'Blanc', value: '#eeeae2' }, { name: 'Chêne clair', value: '#c6a16e' },
  { name: 'Noyer', value: '#785039' }, { name: 'Cachemire', value: '#b9ad9c' },
  { name: 'Graphite', value: '#41464a' }, { name: 'Vert sauge', value: '#87917b' },
];

export function validateStorageSetup(setup: StorageSetup): void {
  if (setup.appearance !== undefined) validateStorageAppearance(setup.appearance);
  if (!['dressing', 'furniture'].includes(setup.kind) || !setup.name.trim() || setup.name.length > 80) throw new Error('Vérifiez le nom du projet.');
  const dimensions = [[setup.widthMm, 400, 6000], [setup.depthMm, 250, 900], [setup.heightMm, 400, 2800]];
  if (dimensions.some(([value, min, max]) => !Number.isFinite(value) || value < min || value > max)) throw new Error('Vérifiez les dimensions du meuble.');
  if (!/^#[0-9a-f]{6}$/i.test(setup.color)) throw new Error('Choisissez une finition valide.');
  if (!Array.isArray(setup.columns) || setup.columns.length < 1 || setup.columns.length > 8) throw new Error('Choisissez entre 1 et 8 colonnes.');
  const columnWidth = setup.widthMm / setup.columns.length;
  if (columnWidth < 300 || columnWidth > 1200) throw new Error('Chaque colonne doit mesurer entre 30 et 120 cm de large.');
  for (const column of setup.columns) {
    if (!['shelves', 'hanging', 'drawers'].includes(column.type) || !Number.isInteger(column.count) || column.count < 1 || column.count > 6 || typeof column.doors !== 'boolean' || (column.type === 'hanging' && column.count !== 1) || (column.type === 'drawers' && column.doors)) throw new Error('Vérifiez la composition des colonnes.');
    if (column.type === 'hanging' && (setup.depthMm < 550 || setup.heightMm < 1200)) throw new Error('Une penderie nécessite au moins 55 cm de profondeur et 120 cm de hauteur.');
    const baseHeight = setup.appearance ? Math.min(setup.appearance.base === 'wall' ? 200 : 100, setup.heightMm / 4) : 0;
    const usableHeight = setup.heightMm - baseHeight - 36;
    if (column.type === 'drawers' && usableHeight / column.count < 120) throw new Error('Chaque tiroir doit disposer d’au moins 12 cm de hauteur.');
    if (column.type === 'shelves' && (usableHeight - column.count * 18) / (column.count + 1) < 100) throw new Error('Prévoyez au moins 10 cm entre les étagères.');
  }
}

export function createCreationProject(setup: CreationSetup, options:{preview?:boolean}={}): Project {
  if (setup.kind === 'kitchen') {
    if (setup.appearance) validateStorageAppearance(setup.appearance);
    const project = { ...createKitchenProject(setup.kitchen,options), creationKind: 'kitchen' as const };
    if (setup.appearance) for (const floor of project.floors) for (const item of floor.furniture) {
      if (item.catalogId === 'counter' || item.kitchenUnit) item.storageAppearance = { ...setup.appearance };
    }
    return project;
  }
  validateStorageSetup(setup);
  const project = createDefaultProject(setup.name.trim());
  project.creationKind = setup.kind;
  const floor = project.floors[0];
  floor.name = creationLabels[setup.kind];
  const width = setup.widthMm / 10, depth = setup.depthMm / 10, height = setup.heightMm / 10;
  floor.walls = [{ id: crypto.randomUUID(), start: { x: 0, y: 0 }, end: { x: width + 80, y: 0 }, thickness: 10, height: Math.max(240, height + 20), color: '#f3f0e9' }];
  floor.furniture = setup.columns.map((column, index): FurnitureItem => ({
    id: crypto.randomUUID(), catalogId: `csm_${column.type}_${column.count}_${column.doors ? 'doors' : 'open'}`,
    position: { x: 40 + width / setup.columns.length * (index + 0.5), y: depth / 2 + 10 },
    rotation: 0, scale: { x: 1, y: 1, z: 1 }, width: width / setup.columns.length,
    depth, height, color: setup.color, material: 'Wood',
    ...(setup.appearance ? { storageAppearance: { ...setup.appearance } } : {}),
  }));
  return project;
}
