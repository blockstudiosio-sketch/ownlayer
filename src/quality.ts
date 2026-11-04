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
const numberValue=(s:string):number|null=>{
 if(!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)||/^0\d/.test(s))return null;
 const n=Number(s);return Number.isFinite(n)?n:null;
};
export function qualityReport(preview:Preview):QualityReport{
 if(preview.sampled||preview.estimatedTotal===null||preview.estimatedTotal!==preview.rows.length)throw new Error('Quality report requires a complete unsampled dataset.');
 if(new Set(preview.columns).size!==preview.columns.length)throw new Error('Duplicate column names cannot be profiled.');
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
  else if(nonempty.every(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))))inferredType='date';
  const numeric=inferredType==='number'?nums as number[]:[];
  return {column,present:nonempty.length,missing,missingPct:pct(missing,values.length),
   distinct,distinctPct:pct(distinct,nonempty.length),inferredType,
   min:numeric.length?Math.min(...numeric):null,max:numeric.length?Math.max(...numeric):null};
 });
 const cells=preview.rows.length*preview.columns.length;
 return {rows:preview.rows.length,columns:preview.columns.length,missingCells,duplicateRows,
  completenessPct:pct(cells-missingCells,cells),columnQuality};
}
