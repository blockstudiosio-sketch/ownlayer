import {collection,deleteDoc,doc,onSnapshot,setDoc,type Unsubscribe} from 'firebase/firestore';
import {deleteObject,getDownloadURL,ref,uploadBytes} from 'firebase/storage';
import {db,storage} from './firebase';
import type {DatasetRecord,SourceRecord,Preview} from './types';
import {formatOf,profileOf} from './parse';

const services=()=>{
 if(!db||!storage)throw new Error('Configure Firebase before using the workspace.');
 return {db,storage};
};
export function watchDatasets(uid:string,ready:(data:DatasetRecord[])=>void,error:(e:string)=>void):Unsubscribe{
 const {db}=services();
 return onSnapshot(collection(db,'ownlayerUsers',uid,'datasets'),snap=>ready(snap.docs.map(d=>({...(d.data() as DatasetRecord),id:d.id})).sort((a,b)=>b.createdAt-a.createdAt)),e=>error(e.message));
}
export function watchSources(uid:string,ready:(data:SourceRecord[])=>void,error:(e:string)=>void):Unsubscribe{
 const {db}=services();
 return onSnapshot(collection(db,'ownlayerUsers',uid,'sources'),snap=>ready(snap.docs.map(d=>({...(d.data() as SourceRecord),id:d.id})).sort((a,b)=>b.createdAt-a.createdAt)),e=>error(e.message));
}
export async function addSource(uid:string,input:Pick<SourceRecord,'name'|'provider'|'locator'>){
 const {db}=services(),entry=doc(collection(db,'ownlayerUsers',uid,'sources'));
 await setDoc(entry,{...input,status:'registered',createdAt:Date.now()});
}
export async function saveDataset(uid:string,file:File,preview:Preview,parentId?:string):Promise<string>{
 const {db,storage}=services(),entry=doc(collection(db,'ownlayerUsers',uid,'datasets'));
 const format=formatOf(file.name),storagePath='ownlayer/users/'+uid+'/datasets/'+entry.id+'/original.'+format;
 const object=ref(storage,storagePath);
 await uploadBytes(object,file,{contentType:file.type||'text/plain'});
 const profile=profileOf(preview);
 const sample={
  columns:preview.columns.slice(0,40),
  rows:preview.rows.slice(0,40).map(row=>Object.fromEntries(preview.columns.slice(0,40).map(c=>[c,(row[c]||'').slice(0,240)]))),
  estimatedTotal:preview.estimatedTotal,
  sampled:preview.sampled||preview.rows.length>40,
  message:'Showing the first 40 stored preview rows.'
 };
 try{
  await setDoc(entry,{name:file.name,source:parentId?'Prepared copy':'Local upload',format,
   size:file.size,rows:preview.estimatedTotal,columns:preview.columns,createdAt:Date.now(),
   storagePath,status:profile.issues.length?'needs-review':'ready',profile,
   parentId:parentId||null,sample});
 }catch(e){await deleteObject(object).catch(()=>undefined);throw e;}
 return entry.id;
}
export async function removeDataset(uid:string,item:DatasetRecord):Promise<void>{
 const {db,storage}=services();
 await deleteDoc(doc(db,'ownlayerUsers',uid,'datasets',item.id));
 await deleteObject(ref(storage,item.storagePath)).catch(()=>undefined);
}
export async function downloadDataset(item:DatasetRecord):Promise<void>{
 const {storage}=services();
 const url=await getDownloadURL(ref(storage,item.storagePath));
 const res=await fetch(url);
 if(!res.ok)throw new Error('Unable to download this dataset.');
 const blob=await res.blob(),href=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=href;a.download=item.name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(href),30000);
}
export async function completePreview(item:DatasetRecord):Promise<Preview>{
 if(item.size>2*1024*1024)throw new Error('Cleaning currently supports files up to 2 MB. Large-file processing needs the backend.');
 if(!['csv','tsv','json','jsonl'].includes(item.format))throw new Error('Cleaning is supported for tabular or JSON files only.');
 const {storage}=services(),url=await getDownloadURL(ref(storage,item.storagePath)),res=await fetch(url);
 if(!res.ok)throw new Error('Cannot retrieve the original file.');
 const {parseText}=await import('./parse');
 return parseText(await res.text(),item.format,false);
}
