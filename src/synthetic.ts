import type {Preview,Row} from './types';

/**
 * Local statistical sample generator. NOT an LLM, a foundation model, or a
 * privacy-preserving synthesis mechanism. Intended only for non-sensitive
 * demo data. It independently samples observed low-cardinality categories
 * and numeric/date ranges; it does not preserve correlations.
 */
const forbidden = /(?:^|[_\s-])(email|e-?mail|phone|mobile|ssn|aadhaar|aadhar|passport|pan|password|secret|token|key|address|first.?name|last.?name|full.?name|account|credit.?card|date.?of.?birth|dob|ip.?address|customer.?id|user.?id)(?:$|[_\s-])/i;
const isNumeric=(value:string):boolean=>/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) &&
 Number.isFinite(Number(value)) && !/^0\d+/.test(value) && !/^-0\d+/.test(value);
const isoDate=(value:string):number|null=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const ms=Date.parse(value+'T00:00:00.000Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().startsWith(value)?ms:null;
};
const rng=(seed:number)=>{
 let state=seed>>>0;
 return ()=>{
  state=(state+0x6D2B79F5)>>>0;
  let x=state;
  x=Math.imul(x^(x>>>15),x|1);
  x^=x+Math.imul(x^(x>>>7),x|61);
  return ((x^(x>>>14))>>>0)/4294967296;
 };
};
export function generateStatisticalDemo(input:Preview,count:number,seed=42):Preview{
 if(!Number.isSafeInteger(count)||count<1||count>5000)throw new Error('Choose between 1 and 5,000 synthetic preview rows.');
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw new Error('Seed must be an integer from 0 to 4294967295.');
 if(input.rows.length<3)throw new Error('At least three source records are needed for this statistical demo.');
 if(input.columns.length===0||input.columns.length>40)throw new Error('This demo accepts between 1 and 40 columns.');
 const random=rng(seed);
 const models=input.columns.map(column=>{
  if(forbidden.test(column)||/^(?:id|name|guid|uuid)$/i.test(column.trim())){
   throw new Error('Potential personal identifier column "'+column+'" detected. Do not synthesize sensitive datasets in this local demo.');
  }
  const values=input.rows.map(row=>row[column]||'');
  const present=values.filter(value=>value.trim()!=='');
  if(!present.length)return {column,missingRate:1,draw:()=>''};
  const missingRate=(values.length-present.length)/values.length;
  if(present.every(isNumeric)){
   const nums=present.map(Number),min=Math.min(...nums),max=Math.max(...nums);
   const precision=Math.min(4,Math.max(...present.map(v=>(v.split('.')[1]||'').replace(/e.*$/i,'').length)));
   return {column,missingRate,draw:()=> {
    const n=min+(max-min)*random();
    return (precision?n.toFixed(precision):String(Math.round(n)));
   }};
  }
  const dates=present.map(isoDate);
  if(dates.every(v=>v!==null)){
   const times=dates as number[],lo=Math.min(...times),hi=Math.max(...times);
   return {column,missingRate,draw:()=>new Date(lo+Math.floor(((hi-lo)/86400000+1)*random())*86400000).toISOString().slice(0,10)};
  }
  const distinct=new Set(present);
  if(distinct.size>Math.max(12,Math.floor(input.rows.length*.35))){
   throw new Error('High-cardinality text column "'+column+'" may contain personal or identifying data. Use a secure server-side generator instead.');
  }
  return {column,missingRate,draw:()=>present[Math.floor(random()*present.length)]};
 });
 const rows:Row[]=Array.from({length:count},()=>{
  const row:Row={};
  for(const model of models)row[model.column]=random()<model.missingRate?'':model.draw();
  return row;
 });
 return {columns:[...input.columns],rows,estimatedTotal:rows.length,sampled:false,
  message:'Experimental statistical demo. NOT an AI foundation model. NOT privacy-preserving. Column correlations and rare categories may be distorted. Do not use with personal or confidential data.'};
}
