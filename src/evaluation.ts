import type {Preview} from './types';

export interface EvaluationSummary {
 schemaMatch: boolean;
 sourceRows: number;
 generatedRows: number;
 noveltyPct: number;
 sourceMissingPct: number;
 generatedMissingPct: number;
 numericInRangePct: number|null;
 categoryCoveragePct: number|null;
}

const isNum=(v:string)=>/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v)&&Number.isFinite(Number(v))&&!/^0\d/.test(v);
const pct=(x:number,y:number)=>y?Math.round(x/y*1000)/10:0;
export function evaluatePreview(source:Preview,generated:Preview):EvaluationSummary{
 if(!source.rows.length||!generated.rows.length||!source.columns.length)throw new Error('Evaluate nonempty source and generated samples.');
 const schemaMatch=source.columns.length===generated.columns.length&&source.columns.every((v,i)=>generated.columns[i]===v);
 const columns=source.columns;
 const key=(r:Record<string,string>)=>JSON.stringify(columns.map(c=>r[c]??''));
 const originals=new Set(source.rows.map(key));
 const repeated=generated.rows.filter(r=>originals.has(key(r))).length;
 const missing=(p:Preview)=>p.rows.reduce((n,r)=>n+columns.filter(c=>!(r[c]??'').trim()).length,0);
 let numericTotal=0,numericValid=0,categoryTotal=0,categoryCovered=0;
 for(const col of columns){
  const values=source.rows.map(r=>r[col]??'').filter(x=>x.trim());
  if(!values.length)continue;
  if(values.every(isNum)){
   const nums=values.map(Number),low=Math.min(...nums),high=Math.max(...nums);
   for(const row of generated.rows){
    const value=(row[col]??'').trim();
    if(!value)continue;
    numericTotal++;
    if(isNum(value)&&Number(value)>=low&&Number(value)<=high)numericValid++;
   }
  }else{
   const unique=new Set(values);
   if(unique.size>Math.max(12,Math.floor(source.rows.length*.35)))continue;
   const present=new Set(generated.rows.map(row=>row[col]??''));
   categoryTotal+=unique.size;
   for(const value of unique)if(present.has(value))categoryCovered++;
  }
 }
 return {
  schemaMatch,sourceRows:source.rows.length,generatedRows:generated.rows.length,
  noveltyPct:pct(generated.rows.length-repeated,generated.rows.length),
  sourceMissingPct:pct(missing(source),source.rows.length*columns.length),
  generatedMissingPct:pct(missing(generated),generated.rows.length*columns.length),
  numericInRangePct:numericTotal?pct(numericValid,numericTotal):null,
  categoryCoveragePct:categoryTotal?pct(categoryCovered,categoryTotal):null
 };
}
