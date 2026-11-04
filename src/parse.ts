import type {DatasetFormat,Preview,Row} from './types';

export const formatOf=(name:string):DatasetFormat=>{
 const ext=(name.split('.').pop()||'').toLowerCase();
 return ['csv','tsv','json','jsonl','txt'].includes(ext)?ext as DatasetFormat:'other';
};
const stringify=(v:unknown):string=>v==null?'':typeof v==='string'?v:typeof v==='object'?JSON.stringify(v):String(v);
function delimited(text:string,sep:string):string[][]{
 const out:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===sep&&!quoted){row.push(field);field='';}
  else if((c==='\n'||c==='\r')&&!quoted){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(field);field='';
   if(row.some(Boolean))out.push(row);
   row=[];
   if(out.length>50000)throw new Error('This file exceeds the current 50,000-row local parsing limit.');
  }else field+=c;
 }
 if(quoted)throw new Error('Unclosed quotation mark in file.');
 if(field||row.length){row.push(field);out.push(row);}
 return out;
}
const headers=(names:string[]):string[]=>{
 const seen=new Map<string,number>();
 return names.map((raw,i)=>{
  const key=raw.trim()||'Column '+(i+1),num=(seen.get(key)||0)+1;
  seen.set(key,num);return num===1?key:key+' ('+num+')';
 });
};
export function parseText(input:string,format:DatasetFormat,truncated=false):Preview{
 const text=input.replace(/^\uFEFF/,'');
 if(format==='csv'||format==='tsv'){
  const arr=delimited(text,format==='csv'?',':'\t');
  const columns=headers(arr.shift()||[]);
  const rows=arr.map(cells=>Object.fromEntries(columns.map((col,i)=>[col,cells[i]??''])));
  return {columns,rows,estimatedTotal:truncated?null:rows.length,sampled:truncated,message:truncated?'Partial file preview: full record count and quality not evaluated.':undefined};
 }
 if(format==='json'||format==='jsonl'){
  if(truncated&&format==='json')throw new Error('Large JSON needs server-side parsing; original upload is still supported.');
  const values:unknown[]=format==='json'?(Array.isArray(JSON.parse(text))?JSON.parse(text) as unknown[]:[JSON.parse(text)]):text.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line) as unknown);
  if(values.length>50000)throw new Error('This file exceeds the current 50,000-record local parsing limit.');
  const rawHeaders=Array.from(new Set(values.flatMap(x=>x!==null&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x):['value'])));
  const columns=headers(rawHeaders);
  const rows=values.map(value=>Object.fromEntries(columns.map((col,i)=>[col,value!==null&&typeof value==='object'&&!Array.isArray(value)?stringify((value as Record<string,unknown>)[rawHeaders[i]]):stringify(value)])));
  return {columns,rows,estimatedTotal:truncated?null:rows.length,sampled:truncated,message:truncated?'Partial JSONL preview only.':undefined};
 }
 if(format==='txt'){
  const lines=text.split(/\r?\n/);
  return {columns:['line','text'],rows:lines.map((line,i)=>({line:String(i+1),text:line})),estimatedTotal:truncated?null:lines.length,sampled:truncated,message:truncated?'Partial text preview only.':undefined};
 }
 throw new Error('Supported formats for data preview: CSV, TSV, JSON, JSONL and TXT.');
}
export async function previewFile(file:File):Promise<Preview>{
 const format=formatOf(file.name);
 if(format==='other')throw new Error('Choose CSV, TSV, JSON, JSONL or TXT for the current demo.');
 const cap=2*1024*1024,truncated=file.size>cap;
 return parseText(await file.slice(0,cap).text(),format,truncated);
}
export function profileOf(preview:Preview){
 const seen=new Set<string>();let missingCells=0,duplicates=0;
 for(const row of preview.rows){
  const key=JSON.stringify(preview.columns.map(c=>row[c]??''));
  if(seen.has(key))duplicates++;seen.add(key);
  for(const c of preview.columns)if(!(row[c]??'').trim())missingCells++;
 }
 const issues:string[]=[];
 if(missingCells)issues.push(missingCells+' missing cells '+(preview.sampled?'in sampled records':'in file'));
 if(duplicates)issues.push(duplicates+' duplicate records '+(preview.sampled?'in sample':'in file'));
 if(preview.sampled)issues.push('Only the preview was profiled; full-file quality remains unverified');
 return {sampledRows:preview.rows.length,missingCells,duplicates,issues};
}
export function cleaned(preview:Preview,trim:boolean,dedupe:boolean):Row[]{
 const seen=new Set<string>();
 return preview.rows.flatMap(row=>{
  const next=Object.fromEntries(preview.columns.map(c=>[c,trim?(row[c]??'').trim():row[c]??'']));
  const key=JSON.stringify(preview.columns.map(c=>next[c]));
  if(dedupe&&seen.has(key))return [];
  seen.add(key);return [next];
 });
}
export function toCsv(columns:string[],rows:Row[]):string{
 const esc=(s:string)=>/[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
 return [columns.map(esc).join(','),...rows.map(row=>columns.map(c=>esc(row[c]??'')).join(','))].join('\r\n')+'\r\n';
}
