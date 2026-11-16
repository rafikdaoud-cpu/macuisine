import type { Project } from '$lib/models/types';
import { createKitchenProject, kitchenStyles } from './kitchenWorkflow';

export function createCustomKitchen(styleName: string, templateName: string): Project {
  const style = kitchenStyles.find(item => item.id === styleName || item.name === styleName) ?? kitchenStyles[0];
  return createKitchenProject({ name: templateName + ' (' + style.name + ')', style: style.id, shape: 'rectangle', layout: 'one-wall', widthMm: 4200, depthMm: 3400, ceilingMm: 2400 });
}
export const houseTemplates = kitchenStyles.map(style => ({
  id: style.id, name: style.name, description: style.description, preview: '',
  create: () => createCustomKitchen(style.id, 'Cuisine personnalisée'),
}));
export function getHouseTemplates() { return houseTemplates; }
