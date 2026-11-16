import {afterEach,expect,it,vi} from 'vitest';
import {Mesh,Group,Vector3,SRGBColorSpace,NoColorSpace,type Material} from 'three';
import {createFinishMaterial,createPanelGeometry,presentationQuality} from '$lib/utils/presentationMaterials';
import {disposeModel} from '$lib/utils/furnitureModelResources';
import {createStorageModel} from '$lib/utils/storageModels';
import {getCatalogItem} from '$lib/utils/furnitureCatalog';
import {defaultStorageAppearance} from '$lib/utils/storageAppearance';
afterEach(()=>vi.unstubAllGlobals());
it('bevels panels without changing the cabinet dimensions or introducing invalid UVs',()=>{
 for(const dims of [[60,220,1.8],[1.8,220,60],[60,.8,1]] as const){
  const geometry=createPanelGeometry(dims[0],dims[1],dims[2]);geometry.computeBoundingBox();
  const size=geometry.boundingBox!.getSize(new Vector3());
  expect(size.x).toBeCloseTo(dims[0],3);expect(size.y).toBeCloseTo(dims[1],3);expect(size.z).toBeCloseTo(dims[2],3);
  expect([...geometry.attributes.uv.array].every(Number.isFinite)).toBe(true);
  geometry.dispose();
 }
});
it('uses dielectric matt and glossy finishes instead of making painted wood metallic',()=>{
 const matt=createFinishMaterial('white'),gloss=createFinishMaterial('white',true);
 expect(matt.metalness).toBe(0);expect(gloss.metalness).toBe(0);
 expect(gloss.clearcoat).toBeGreaterThan(matt.clearcoat);expect(gloss.roughness).toBeLessThan(matt.roughness);
 matt.dispose();gloss.dispose();
});
it('caps mobile rendering cost and high DPI while allowing sharper desktop shadows',()=>{
 expect(presentationQuality(4,true)).toEqual({pixelRatio:1.5,shadowSize:1024});
 expect(presentationQuality(3,false)).toEqual({pixelRatio:1.75,shadowSize:2048});
 expect(presentationQuality(NaN,true,512)).toEqual({pixelRatio:1,shadowSize:512});
});
it('shares identical finishes inside each cabinet without coupling the lifetime of separate cabinets',()=>{
 const definition={...getCatalogItem('csm_shelves_3_doors')!,storageAppearance:defaultStorageAppearance()};
 const first=createStorageModel(definition.id,definition)!,second=createStorageModel(definition.id,definition)!;
 const physical=(root:Group)=>{const result=new Set<Material>();root.traverse(child=>{const material=(child as Mesh).material;if(material&&!Array.isArray(material)&&'isMeshPhysicalMaterial' in material)result.add(material);});return result;};
 const a=[...physical(first)],b=[...physical(second)];expect(a).toHaveLength(1);expect(b).toHaveLength(1);expect(a[0]).not.toBe(b[0]);
 const disposed=vi.fn();b[0].addEventListener('dispose',disposed);disposeModel(first);expect(disposed).not.toHaveBeenCalled();disposeModel(second);expect(disposed).toHaveBeenCalledOnce();
});
it('keeps color and bump maps in their proper color spaces and releases them with the model',()=>{
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:()=>{}})})});
 const material=createFinishMaterial('oak'),colorDisposed=vi.fn(),bumpDisposed=vi.fn();
 expect(material.map!.colorSpace).toBe(SRGBColorSpace);expect(material.bumpMap!.colorSpace).toBe(NoColorSpace);
 material.map!.addEventListener('dispose',colorDisposed);material.bumpMap!.addEventListener('dispose',bumpDisposed);
 const root=new Group();root.add(new Mesh(createPanelGeometry(60,220,1.8),material));
 disposeModel(root);expect(colorDisposed).toHaveBeenCalledOnce();expect(bumpDisposed).toHaveBeenCalledOnce();
});
