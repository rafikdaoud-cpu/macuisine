import { describe, expect, it } from 'vitest';
import { defaultStorageAppearance, validateStorageAppearance, storageAppearanceSummary } from '$lib/utils/storageAppearance';
import { createStorageModel } from '$lib/utils/storageModels';
import { createCreationProject } from '$lib/utils/creationWorkflow';
import { readProject } from '$lib/utils/projectValidation';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';

describe('finishes and workshop options', () => {
  it('retains separate finishes and every selected option in a saved/reopened project', () => {
    const appearance = { ...defaultStorageAppearance(), carcass:'concrete' as const, facades:'oak' as const, top:'black' as const, gloss:true, handle:'knob' as const, handleColor:'gold' as const, base:'feet' as const, back:false, sliding:true, led:true, softClose:true };
    const project = createCreationProject({kind:'furniture',name:'Mon rangement',widthMm:1200,heightMm:1200,depthMm:600,color:'#aaaaaa',columns:[{type:'shelves',count:3,doors:true}],appearance});
    const loaded = readProject(JSON.parse(JSON.stringify(project)));
    expect(loaded.floors[0].furniture[0].storageAppearance).toEqual(appearance);
    const summary = storageAppearanceSummary(appearance);
    expect(summary).toContain('Béton'); expect(summary).toContain('Chêne naturel'); expect(summary).toContain('fermeture douce : oui');
  });
  it.each([{carcass:'unknown'},{led:'yes'},{handle:'script'},{base:null},{top:'url(http://example.com)'}])('rejects unsupported finish data: %j',value=>{
    expect(()=>validateStorageAppearance({...defaultStorageAppearance(),...value})).toThrow();
  });
  it('slides doors instead of rotating them when sliding is chosen',()=>{
    const definition={...getCatalogItem('csm_shelves_4_doors')!,storageAppearance:{...defaultStorageAppearance(),sliding:true}};
    const closed=createStorageModel(definition.id,definition)!, opened=createStorageModel(definition.id,definition,true)!;
    expect(opened.getObjectByName('door-left')!.rotation.y).toBe(0);
    expect(opened.getObjectByName('door-left')!.position.x).toBeGreaterThan(closed.getObjectByName('door-left')!.position.x);
  });
});
