import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import { createCreationProject, validateStorageSetup, type StorageSetup } from '$lib/utils/creationWorkflow';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { createStorageModel } from '$lib/utils/storageModels';
import { readProject } from '$lib/utils/projectValidation';

const setup = (): StorageSetup => ({
  kind: 'dressing', name: 'Dressing chambre', widthMm: 2400, depthMm: 600, heightMm: 2200, color: '#c6a16e',
  columns: [{ type: 'hanging', count: 1, doors: false }, { type: 'shelves', count: 4, doors: true }, { type: 'drawers', count: 3, doors: false }],
});

describe('CSM sur mesure', () => {
  it('keeps millimetres, independent columns, catalog references and saved geometry consistent', () => {
    const input = setup(), before = structuredClone(input), project = createCreationProject(input);
    const items = project.floors[0].furniture;
    expect(input).toEqual(before);
    expect(items).toHaveLength(3);
    expect(items.map(item => item.width)).toEqual([80, 80, 80]);
    expect(items.map(item => item.position.x)).toEqual([80, 160, 240]);
    expect(items.every(item => item.depth === 60 && item.height === 220 && getCatalogItem(item.catalogId))).toBe(true);
    expect(readProject(JSON.parse(JSON.stringify(project))).creationKind).toBe('dressing');
    expect(new Set(items.map(item => item.id)).size).toBe(3);
  });
  it.each([
    { widthMm: NaN }, { widthMm: 6001 }, { columns: [] },
    { widthMm: 400, columns: setup().columns }, { depthMm: 400 }, { heightMm: 900 },
    { columns: [{ type: 'drawers', count: 6, doors: false }], heightMm: 400 },
    { columns: [{ type: 'shelves', count: 6, doors: false }], heightMm: 400 },
  ])('rejects impossible or missing dimensions/composition: %j', changes => {
    expect(() => validateStorageSetup({ ...setup(), ...changes } as StorageSetup)).toThrow();
  });
  it('generates real shelves and drawer fronts instead of stretching a generic closed block', () => {
    const shelf = getCatalogItem('csm_shelves_4_open')!;
    const model = createStorageModel(shelf.id, shelf)!;
    expect(model.getObjectsByProperty('type', 'Mesh')).toHaveLength(9);
    const bounds = new Box3().setFromObject(model);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(60);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(220);
    const drawer = getCatalogItem('csm_drawers_3_open')!;
    expect(createStorageModel(drawer.id, drawer)!.getObjectsByProperty('type', 'Mesh')).toHaveLength(11);
    expect(createStorageModel('wardrobe', shelf)).toBeNull();
  });
  it('opens old projects without the new category and rejects unknown new categories', () => {
    const project = createCreationProject(setup());
    delete project.creationKind;
    expect(readProject(project).creationKind).toBeUndefined();
    expect(() => readProject({ ...project, creationKind: 'unknown' })).toThrow();
  });
  it('opens doors at their side hinges and extends drawers without changing the caisson', () => {
    const door = getCatalogItem('csm_shelves_4_doors')!;
    const closed = createStorageModel(door.id, door)!;
    const opened = createStorageModel(door.id, door, true)!;
    expect(closed.getObjectByName('door-left')!.rotation.y).toBe(0);
    expect(opened.getObjectByName('door-left')!.rotation.y).toBeCloseTo(-Math.PI / 2);
    expect(opened.getObjectByName('door-right')!.rotation.y).toBeCloseTo(Math.PI / 2);
    const drawer = getCatalogItem('csm_drawers_3_open')!;
    const boundsClosed = new Box3().setFromObject(createStorageModel(drawer.id, drawer)!);
    const boundsOpen = new Box3().setFromObject(createStorageModel(drawer.id, drawer, true)!);
    expect(boundsOpen.max.z - boundsClosed.max.z).toBeCloseTo(drawer.depth * 0.65);
    expect(boundsOpen.min.x).toBeCloseTo(boundsClosed.min.x);
    expect(boundsOpen.max.y).toBeCloseTo(boundsClosed.max.y);
  });
});
