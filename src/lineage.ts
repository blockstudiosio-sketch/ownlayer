import type {DatasetRecord} from './types';

export type LineageNode =
 | {kind:'dataset';dataset:DatasetRecord}
 | {kind:'missing';id:string}
 | {kind:'cycle';id:string};
export interface LineageTrace {nodes:LineageNode[];descendants:DatasetRecord[];complete:boolean;}

/** Trace every known parent from the selected record back to its root.
 * Never recurse through untrusted metadata; cycles and deleted ancestors are visible.
 */
export function traceLineage(selectedId:string,records:DatasetRecord[]):LineageTrace{
 const byId=new Map(records.map(record=>[record.id,record]));
 const nodes:LineageNode[]=[];
 const visited=new Set<string>();
 let id:string|null|undefined=selectedId;
 while(id){
  if(visited.has(id)){nodes.push({kind:'cycle',id});break;}
  visited.add(id);
  const dataset=byId.get(id);
  if(!dataset){nodes.push({kind:'missing',id});break;}
  nodes.push({kind:'dataset',dataset});
  id=dataset.parentId;
 }
 const descendants:DatasetRecord[]=[];
 for(const record of records){
  if(record.id===selectedId)continue;
  const seen=new Set<string>([record.id]);
  let ancestor=record.parentId;
  while(ancestor&&!seen.has(ancestor)){
   if(ancestor===selectedId){descendants.push(record);break;}
   seen.add(ancestor);
   ancestor=byId.get(ancestor)?.parentId;
  }
 }
 descendants.sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id));
 return {nodes,descendants,complete:nodes.length>0&&nodes.every(n=>n.kind==='dataset')};
}

/** Prevent a user from deleting an ancestor while derived datasets still exist.
 * This is an application-level guard; backend enforcement requires a transaction
 * and security rules that must be coordinated with the shared Firebase project.
 */
export function assertNoDescendants(selectedId:string,records:DatasetRecord[]):void{
 const dependents=traceLineage(selectedId,records).descendants;
 if(dependents.length){
  const names=dependents.slice(0,3).map(record=>record.name).join(', ');
  throw new Error('Cannot delete this dataset: '+dependents.length+' derived dataset(s) depend on it ('+names+(dependents.length>3?', …':'')+'). Delete derived datasets first.');
 }
}
