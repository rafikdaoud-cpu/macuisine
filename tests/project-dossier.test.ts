import {expect,it,afterEach} from 'vitest';
import {branding,defaultBranding} from '$lib/stores/branding';
afterEach(()=>branding.set({...defaultBranding}));
import {projectDetailLines} from '$lib/utils/projectDossier';
import {createCreationProject} from '$lib/utils/creationWorkflow';
import {storagePreset} from '$lib/utils/storagePresets';
it('lists every cabinet with its real centimetre dimensions and the requested business contacts',()=>{
 branding.set({...defaultBranding,companyName:'Atelier Démo',phone:'01 23 45 67 89',contactEmail:'contact@example.com',website:'https://example.com'});
 const project=createCreationProject(storagePreset('furniture-low')),before=JSON.stringify(project);
 const lines=projectDetailLines(project,'fr',false).join('\n');
 expect(lines).toContain('60 × 45 × 90 cm');expect(lines).toContain('Encombrement des meubles : 180 × 45 × 90 cm');expect(lines).toContain('01 23 45 67 89');expect(lines).toContain('contact@example.com');expect(lines).toContain('https://example.com');
 expect(lines).not.toContain('600 × 450 × 900');expect(JSON.stringify(project)).toBe(before);
});
it('includes finishes and all floors in the full dossier, while the PNG summary can omit finish paragraphs',()=>{
 const project=createCreationProject(storagePreset('furniture-low'));project.floors.push({...structuredClone(project.floors[0]),id:'second-floor',name:'Deuxième étage'});
 expect(projectDetailLines(project).join('\n')).toContain('Deuxième étage');expect(projectDetailLines(project).join('\n')).toContain('FINITIONS');
});
