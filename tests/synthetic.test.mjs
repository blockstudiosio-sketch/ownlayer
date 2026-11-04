import test from 'node:test';
import assert from 'node:assert/strict';
import {generateStatisticalDemo} from '../src/synthetic.ts';

const source={
 columns:['age','city','joined'],
 rows:[
  {age:'23',city:'A',joined:'2026-01-01'},
  {age:'30',city:'B',joined:'2026-01-08'},
  {age:'35',city:'A',joined:'2026-01-20'},
  {age:'27',city:'B',joined:'2026-01-13'}
 ],
 estimatedTotal:4,sampled:false
};
test('synthetic samples are deterministic and preserve supported schema',()=>{
 const a=generateStatisticalDemo(source,20,512);
 const b=generateStatisticalDemo(source,20,512);
 assert.deepEqual(a,b);
 assert.equal(a.rows.length,20);
 assert.deepEqual(a.columns,source.columns);
 assert.notDeepEqual(a.rows,generateStatisticalDemo(source,20,513).rows);
 assert.equal(a.sampled,false);
 assert.match(a.message,/NOT privacy-preserving/);
});
test('number and ISO date values stay within observed range',()=>{
 const out=generateStatisticalDemo(source,500,7);
 for(const row of out.rows){
  assert.ok(Number(row.age)>=23&&Number(row.age)<=35);
  assert.ok(['A','B'].includes(row.city));
  assert.ok(row.joined>='2026-01-01'&&row.joined<='2026-01-20');
 }
});
test('blocks explicit identifiers and high-cardinality text',()=>{
 assert.throws(()=>generateStatisticalDemo({...source,columns:['email'],rows:[{email:'a@x.io'},{email:'b@x.io'},{email:'c@x.io'}]},10),/personal identifier/);
 const rows=Array.from({length:50},(_,i)=>({comment:'Unique long free text '+i}));
 assert.throws(()=>generateStatisticalDemo({...source,columns:['comment'],rows},10),/High-cardinality/);
});
test('validates configuration and tiny samples',()=>{
 assert.throws(()=>generateStatisticalDemo(source,0),/between 1 and 5,000/);
 assert.throws(()=>generateStatisticalDemo(source,5001),/between 1 and 5,000/);
 assert.throws(()=>generateStatisticalDemo(source,3,2.5),/Seed must/);
 assert.throws(()=>generateStatisticalDemo({...source,rows:source.rows.slice(0,2)},1),/At least three/);
});
