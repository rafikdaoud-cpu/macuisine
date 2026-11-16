import { describe, expect, it } from 'vitest';
import { furnitureFrontLayout } from '$lib/utils/furnitureFrontLayout';
import type { FurnitureItem } from '$lib/models/types';

const item = (id: string, x: number, width = 60, height = 220): FurnitureItem => ({ id, catalogId: 'csm_shelves_4_open', position: { x, y: 40 }, rotation: 0, width, height, depth: 60, scale: { x: 1, y: 1, z: 1 } });

describe('front view of furniture', () => {
  it('uses the real height and width, preserves the saved plan, and sorts columns left to right', () => {
    const input = [item('right', 180, 90, 200), item('left', 40, 80, 220)];
    const before = structuredClone(input), layout = furnitureFrontLayout(input);
    expect(input).toEqual(before);
    expect(layout.width).toBe(170); expect(layout.height).toBe(220);
    expect(layout.columns.map(column => [column.item.id, column.x, column.count])).toEqual([['left', 0, 4], ['right', 80, 4]]);
  });
  it('focuses the selected module and respects saved scale and front type', () => {
    const module = { ...item('drawers', 10), catalogId: 'csm_drawers_3_open', scale: { x: 2, y: 1, z: 0.5 } };
    const layout = furnitureFrontLayout([module, item('shelves', 90)], 'drawers');
    expect(layout.columns).toHaveLength(1); expect(layout.width).toBe(120); expect(layout.height).toBe(110);
    expect(layout.columns[0].type).toBe('drawers'); expect(layout.columns[0].count).toBe(3);
  });
  it('handles an empty floor and deleted selection without losing the other modules', () => {
    expect(furnitureFrontLayout([])).toEqual({ columns: [], width: 0, height: 0 });
    expect(furnitureFrontLayout([item('valid', 0)], 'deleted').columns).toHaveLength(1);
  });
});
