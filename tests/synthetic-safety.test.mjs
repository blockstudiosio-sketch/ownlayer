import test from 'node:test';
import assert from 'node:assert/strict';
import {generateStatisticalDemo} from '../src/synthetic.ts';

test('rejects clipped source previews rather than claiming a complete synthetic baseline',()=>{
 const input={columns:['age'],rows:[{age:'20'},{age:'21'},{age:'22'}],estimatedTotal:null,sampled:true};
 assert.throws(()=>generateStatisticalDemo(input,10),/fully parsed source/);
});
test('rejects mostly unique integer identifiers even when header is innocuous',()=>{
 const rows=Array.from({length:30},(_,i)=>({sequence:String(100000+i)}));
 const input={columns:['sequence'],rows,estimatedTotal:30,sampled:false};
 assert.throws(()=>generateStatisticalDemo(input,10),/may be an identifier/);
});
test('allows low-cardinality integer categories',()=>{
 const rows=Array.from({length:30},(_,i)=>({rating:String(1+i%5)}));
 const input={columns:['rating'],rows,estimatedTotal:30,sampled:false};
 const result=generateStatisticalDemo(input,12,42);
 assert.equal(result.rows.length,12);
});
