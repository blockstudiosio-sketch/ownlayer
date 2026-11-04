import type {Preview} from './types';

export interface ColumnQuality {
 column:string;
 present:number;
 missing:number;
 missingPct:number;
 distinct:number;
 distinctPct:number;
 inferredType:'empty'|'number'|'boolean'|'date'|'text';
 min:number|null;
 max:number|null;
}
export interface QualityReport {
 rows:number;
 columns:number;
 missingCells:number;
 duplicateRows:number;
 completenessPct:number;
 columnQuality:ColumnQuality[];
}
const pct=(a:number,b:number)=>b?Math.round(a/b*1000)/10:100;
const validISODate=(s:string)=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const [year,month,day]=s.split('-').map(Number);
 if(year<100||year>9999||month<1||month>12||day<1||day>31)return false;
 const date=new Date(Date.UTC(year,month-1,day));
 return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
};
const numberValue=(s:string):number|null=>{
 if(!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)||/^0\d/.test(s))return null;
 const n=Number(s);return Number.isFinite(n)?n:null;
};
export function qualityReport(preview:Preview):QualityReport{
 if(preview.sampled||preview.estimatedTotal===null||preview.estimatedTotal!==preview.rows.length)throw new Error('Quality report requires a complete unsampled dataset.');
 if(!preview.columns.length||preview.columns.some(c=>!c.trim()))throw new Error('Quality report requires nonempty column names.');
 if(new Set(preview.columns).size!==preview.columns.length)throw new Error('Duplicate column names cannot be profiled.');
 if(preview.rows.some(row=>Object.keys(row).some(c=>!preview.columns.includes(c))))throw new Error('Quality report rejects unexpected row fields; check schema before profiling.');
 if(preview.columns.length>500||preview.rows.length>50000)throw new Error('Quality report exceeds local processing limits.');
 const seenRows=new Set<string>();let duplicateRows=0,missingCells=0;
 for(const row of preview.rows){
  const key=JSON.stringify(preview.columns.map(c=>row[c]??''));
  if(seenRows.has(key))duplicateRows++;
  seenRows.add(key);
 }
 const columnQuality=preview.columns.map(column=>{
  const values=preview.rows.map(r=>(r[column]??'').trim()),nonempty=values.filter(Boolean);
  const missing=values.length-nonempty.length;missingCells+=missing;
  const distinct=new Set(nonempty).size;
  const nums=nonempty.map(numberValue);
  let inferredType:ColumnQuality['inferredType']='text';
  if(!nonempty.length)inferredType='empty';
  else if(nums.every(v=>v!==null))inferredType='number';
  else if(nonempty.every(v=>/^(true|false|yes|no)$/i.test(v)))inferredType='boolean';
  else if(nonempty.every(validISODate))inferredType='date';
  const numeric=inferredType==='number'?nums as number[]:[];
  return {column,present:nonempty.length,missing,missingPct:pct(missing,values.length),
   distinct,distinctPct:pct(distinct,nonempty.length),inferredType,
   min:numeric.length?Math.min(...numeric):null,max:numeric.length?Math.max(...numeric):null};
 });
 const cells=preview.rows.length*preview.columns.length;
 return {rows:preview.rows.length,columns:preview.columns.length,missingCells,duplicateRows,
  completenessPct:pct(cells-missingCells,cells),columnQuality};
}
