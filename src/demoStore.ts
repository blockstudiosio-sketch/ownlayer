import type {DatasetRecord,Preview,SourceRecord,DatasetFormat} from './types';
import {parseText,profileOf,toCsv,formatOf} from './parse';
import {assertNoDescendants} from './lineage';

export const isDemoUid=(uid:string)=>uid==='ownlayer-demo';
const KEY='ownlayer:demo:v1:';
const datasetsListeners=new Set<(x:DatasetRecord[])=>void>();
const sourcesListeners=new Set<(x:SourceRecord[])=>void>();
const read=<T>(name:string, fallback:T):T=>{
 try{const data=localStorage.getItem(KEY+name);return data?JSON.parse(data) as T:fallback;}
 catch{return fallback;}
};
const write=(name:string,value:unknown)=>localStorage.setItem(KEY+name,JSON.stringify(value));
const datasets=()=>read<DatasetRecord[]>('datasets',[]);
const sources=()=>read<SourceRecord[]>('sources',[]);
const notify=()=>{
 const d=datasets(),s=sources();
 for(const fn of datasetsListeners)fn(d);
 for(const fn of sourcesListeners)fn(s);
};
const categories=['North Field','Orchard','Greenhouse','South Field'] as const;
const channels=['Online','In-store','Partner'] as const;
const policyTypes=['Motor','Health','Home','Travel'] as const;
const fixtureDate=(n:number)=>new Date(Date.UTC(2026,9,1+n%27)).toISOString().slice(0,10);
function fixtureRows(name:'agriculture'|'commerce'|'insurance',n:number):Preview{
 const data:Record<string,string>[]=[];
 for(let i=0;i<n;i++){
  if(name==='agriculture')data.push({
   zone:categories[i%categories.length],
   soil_moisture_pct:String(19+(i*13)%60),
   air_temp_c:String(24+(i*7)%16),
   humidity_pct:String(38+(i*11)%56),
   irrigation_needed:i%4===0?'Yes':'No',
   sensor_status:i%19===0?'':'Normal',
   reading_date:fixtureDate(i)
  });
  if(name==='commerce')data.push({
   category:['Home','Grocery','Electronics','Apparel'][i%4],
   channel:channels[i%channels.length],
   order_value:String(280+(i*137)%4200),
   items:String(1+i%5),
   return_flag:i%9===0?'Yes':'No',
   order_date:fixtureDate(i)
  });
  if(name==='insurance')data.push({
   policy_type:policyTypes[i%policyTypes.length],
   premium_amount:String(400+(i*173)%3800),
   claim_amount:String(i%5===0?0:500+(i*193)%6700),
   claim_status:['Approved','Pending','Rejected'][i%3],
   region:['Urban','Suburban','Rural'][i%3],
   received_on:fixtureDate(i)
  });
 }
 if(name==='agriculture'&&data.length>=10)data[9]={...data[8]};
 const columns=Object.keys(data[0]);
 return {columns,rows:data,estimatedTotal:n,sampled:false,message:'Curated synthetic sample values for demonstration only.'};
}
function ensureSeeded(){
 if(read<boolean>('seeded',false))return;
 const now=Date.now();
 const specs=[
  {id:'demo-agriculture',name:'Agri_IoT_Readings.csv',kind:'agriculture' as const,count:72},
  {id:'demo-commerce',name:'Retail_Orders.csv',kind:'commerce' as const,count:55},
  {id:'demo-insurance',name:'Insurance_Claims.csv',kind:'insurance' as const,count:48}
 ];
 const result:DatasetRecord[]=[];
 for(const [index,spec] of specs.entries()){
  const preview=fixtureRows(spec.kind,spec.count);
  const csv=toCsv(preview.columns,preview.rows),id=spec.id;
  const profile=profileOf(preview);
  localStorage.setItem(KEY+'file:'+id,csv);
  result.push({id,name:spec.name,source:'Sample dataset · not customer data',format:'csv',size:new Blob([csv]).size,
   rows:spec.count,columns:preview.columns,createdAt:now-index*86400000,
   storagePath:'localdemo:'+id,status:profile.issues.length?'needs-review':'ready',profile,
   sample:{...preview,rows:preview.rows.slice(0,40),sampled:false,
    message:'First 40 of '+spec.count+' fictitious sample records.'}});
 }
 write('datasets',result);
 write('sources',[{id:'sample-source',name:'Built-in sample library',provider:'other',locator:'Curated demonstration files; no external synchronization',createdAt:now,status:'registered'}]);
 write('seeded',true);
}
export function demoWatchDatasets(cb:(x:DatasetRecord[])=>void){
 ensureSeeded();datasetsListeners.add(cb);cb(datasets());
 return ()=>{datasetsListeners.delete(cb);};
}
export function demoWatchSources(cb:(x:SourceRecord[])=>void){
 ensureSeeded();sourcesListeners.add(cb);cb(sources());
 return ()=>{sourcesListeners.delete(cb);};
}
export async function demoAddSource(input:Pick<SourceRecord,'name'|'provider'|'locator'>){
 ensureSeeded();
 const value:SourceRecord={...input,id:'source-'+crypto.randomUUID(),createdAt:Date.now(),status:'registered'};
 write('sources',[value,...sources()]);notify();
}
export async function demoSave(file:File,preview:Preview,parentId?:string,originLabel?:string){
 ensureSeeded();
 if(file.size>1024*1024)throw new Error('Interactive demo uploads are limited to 1 MB to protect your browser storage.');
 const id='demo-'+crypto.randomUUID();
 const content=await file.text();
 const profile=profileOf(preview);
 const sample:Preview={...preview,columns:preview.columns.slice(0,40),
  rows:preview.rows.slice(0,40).map(row=>Object.fromEntries(preview.columns.slice(0,40).map(c=>[c,(row[c]||'').slice(0,240)]))),
  message:'Showing first '+Math.min(preview.rows.length,40)+' rows stored in this browser.'};
 const record:DatasetRecord={id,name:file.name,source:originLabel||(parentId?'Prepared copy':'Local browser upload'),
  format:formatOf(file.name),size:file.size,rows:preview.estimatedTotal,columns:preview.columns,
  createdAt:Date.now(),storagePath:'localdemo:'+id,status:profile.issues.length?'needs-review':'ready',
  profile,parentId:parentId||null,sample};
 // Save file before its metadata. On quota exhaustion do not show a ghost dataset.
 localStorage.setItem(KEY+'file:'+id,content);
 try{write('datasets',[record,...datasets()]);}
 catch(e){localStorage.removeItem(KEY+'file:'+id);throw e;}
 notify();
 return id;
}
export async function demoRemove(item:DatasetRecord){
 ensureSeeded();
 assertNoDescendants(item.id,datasets());
 write('datasets',datasets().filter(d=>d.id!==item.id));
 localStorage.removeItem(KEY+'file:'+item.id);
 notify();
}
const fileContents=(item:DatasetRecord)=>{
 const content=localStorage.getItem(KEY+'file:'+item.id);
 if(content===null)throw new Error('Sample file missing from browser storage. Reset or upload your demo data.');
 return content;
};
export async function demoDownload(item:DatasetRecord){
 const content=fileContents(item);
 const href=URL.createObjectURL(new Blob([content],{type:item.format==='json'?'application/json':'text/plain'}));
 const a=document.createElement('a');a.href=href;a.download=item.name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(href),2000);
}
export async function demoCompletePreview(item:DatasetRecord):Promise<Preview>{
 if(item.size>2*1024*1024)throw new Error('Full local preparation supports files up to 2 MB.');
 const supported=['csv','tsv','json','jsonl'] as DatasetFormat[];
 if(!supported.includes(item.format))throw new Error('Use CSV, TSV, JSON or JSONL for preparation and synthesis.');
 return parseText(fileContents(item),item.format,false);
}
