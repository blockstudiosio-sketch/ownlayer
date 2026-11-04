import type {Preview,Row} from './types';

export interface ColumnProfile {
 name:string;
 inferredType:'number'|'boolean'|'date'|'text'|'empty';
 populated:number;
 missing:number;
 distinct:number;
 examples:string[];
 min?:number;
 max?:number;
}
export interface SchemaDrift {
 addedColumns:string[];
 removedColumns:string[];
 changedTypes:Array<{column:string;before:string;after:string}>;
 missingRateChanges:Array<{column:string;beforePct:number;afterPct:number;deltaPct:number}>;
 compatible:boolean;
}
const isNumber=(s:string)=>/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)&&Number.isFinite(Number(s))&&!/^0\d/.test(s);
const isBoolean=(s:string)=>/^(true|false|yes|no)$/i.test(s);
const isDate=(s:string)=>/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s)&&!Number.isNaN(Date.parse(s));
const round=(n:number)=>Math.round(n*10)/10;
function infer(values:string[]):ColumnProfile['inferredType']{
 if(!values.length)return 'empty';
 if(values.every(isNumber))return 'number';
 if(values.every(isBoolean))return 'boolean';
 if(values.every(isDate))return 'date';
 return 'text';
}
export function profileColumns(preview:Preview):ColumnProfile[]{
 if(!preview.columns.length)throw new Error('Cannot profile a dataset without columns.');
 if(preview.columns.length>500)throw new Error('Column profiling supports at most 500 columns.');
 if(preview.rows.length>50000)throw new Error('Column profiling supports at most 50,000 rows.');
 return preview.columns.map(name=>{
  const values=preview.rows.map((row:Row)=>(row[name]??'').trim());
  const populatedValues=values.filter(Boolean);
  const inferredType=infer(populatedValues);
  const distinctValues=[...new Set(populatedValues)];
  const profile:ColumnProfile={name,inferredType,populated:populatedValues.length,
   missing:values.length-populatedValues.length,distinct:distinctValues.length,
   examples:distinctValues.slice(0,3).map(s=>s.slice(0,100))};
  if(inferredType==='number'){
   const nums=populatedValues.map(Number);
   profile.min=Math.min(...nums);
   profile.max=Math.max(...nums);
  }
  return profile;
 });
}
export function compareSchema(before:Preview,after:Preview,missingThresholdPct=10):SchemaDrift{
 if(before.sampled||after.sampled)throw new Error('Schema drift evaluation requires complete, non-sampled datasets.');
 if(!Number.isFinite(missingThresholdPct)||missingThresholdPct<0||missingThresholdPct>100)throw new Error('Missing-rate threshold must be 0–100.');
 const old=profileColumns(before),current=profileColumns(after);
 const oldMap=new Map(old.map(x=>[x.name,x])),newMap=new Map(current.map(x=>[x.name,x]));
 const addedColumns=current.filter(x=>!oldMap.has(x.name)).map(x=>x.name);
 const removedColumns=old.filter(x=>!newMap.has(x.name)).map(x=>x.name);
 const changedTypes:Array<{column:string;before:string;after:string}>=[];
 const missingRateChanges:SchemaDrift['missingRateChanges']=[];
 for(const col of old){
  const next=newMap.get(col.name);
  if(!next)continue;
  if(col.inferredType!==next.inferredType)changedTypes.push({column:col.name,before:col.inferredType,after:next.inferredType});
  const beforePct=before.rows.length?round(col.missing/before.rows.length*100):0;
  const afterPct=after.rows.length?round(next.missing/after.rows.length*100):0;
  const deltaPct=round(afterPct-beforePct);
  if(Math.abs(deltaPct)>missingThresholdPct)missingRateChanges.push({column:col.name,beforePct,afterPct,deltaPct});
 }
 return {addedColumns,removedColumns,changedTypes,missingRateChanges,
  compatible:removedColumns.length===0&&changedTypes.length===0&&missingRateChanges.length===0};
}
