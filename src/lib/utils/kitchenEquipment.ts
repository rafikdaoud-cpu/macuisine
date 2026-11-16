export type KitchenEquipment = {
  totalHeightMm:number; baseHeightMm:number; baseDepthMm:number; upperHeightMm:number; upperDepthMm:number;
  fridge:boolean; fridgeSide:'left'|'right'; fridgeWidthMm:number; returnSide:'left'|'right'; returnLengthMm:number;
  widthsMm:number[];
};
export const kitchenUnitLabels=['Meuble bas à portes','Meuble à 3 tiroirs','Meuble sous évier','Four et plaque','Meuble bas de rangement'];
export const defaultKitchenEquipment=():KitchenEquipment=>({totalHeightMm:2250,baseHeightMm:880,baseDepthMm:600,upperHeightMm:700,upperDepthMm:350,fridge:true,fridgeSide:'left',fridgeWidthMm:650,returnSide:'right',returnLengthMm:2000,widthsMm:[600,600,600,600,350]});
export function kitchenLengthMm(e:KitchenEquipment){return e.widthsMm.reduce((a,b)=>a+b,0)+(e.fridge?e.fridgeWidthMm:0);}
export function validateKitchenEquipment(e:KitchenEquipment):void{
  const dims=[[e.totalHeightMm,1800,3000],[e.baseHeightMm,700,1100],[e.baseDepthMm,500,800],[e.upperHeightMm,400,1100],[e.upperDepthMm,250,450],[e.fridgeWidthMm,550,900],[e.returnLengthMm,900,5000]];
  if(dims.some(([v,min,max])=>!Number.isFinite(v)||v<min||v>max)||!Array.isArray(e.widthsMm)||e.widthsMm.length!==5||e.widthsMm.some(v=>!Number.isFinite(v)||v<300||v>1200))throw new Error('Vérifiez les dimensions des éléments de cuisine.');
  if(e.totalHeightMm-e.baseHeightMm-e.upperHeightMm<450)throw new Error('Prévoyez au moins 45 cm entre les meubles bas et hauts.');
  if(typeof e.fridge!=='boolean'||!['left','right'].includes(e.fridgeSide)||!['left','right'].includes(e.returnSide))throw new Error('Vérifiez les options de cuisine.');
}
