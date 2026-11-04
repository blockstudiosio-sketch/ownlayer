import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePreview} from '../src/evaluation.ts';

test('evaluation metrics are calculated from actual input arrays',()=>{
 const source={columns:['region','temperature'],rows:[{region:'North',temperature:'20'},{region:'South',temperature:'30'},{region:'North',temperature:'25'}],estimatedTotal:3,sampled:false};
 const generated={columns:[...source.columns],rows:[{region:'North',temperature:'25'},{region:'South',temperature:'28'},{region:'North',temperature:''}],estimatedTotal:3,sampled:false};
 const e=evaluatePreview(source,generated);
 assert.equal(e.schemaMatch,true);
 assert.equal(e.sourceRows,3);
 assert.equal(e.generatedRows,3);
 assert.equal(e.noveltyPct,66.7);
 assert.equal(e.sourceMissingPct,0);
 assert.equal(e.generatedMissingPct,16.7);
 assert.equal(e.numericInRangePct,100);
 assert.equal(e.categoryCoveragePct,100);
});
test('evaluation reports category gap and numeric out-of-range',()=>{
 const source={columns:['segment','amount'],rows:[{segment:'A',amount:'1'},{segment:'B',amount:'2'},{segment:'C',amount:'3'}],estimatedTotal:3,sampled:false};
 const generated={columns:['amount','segment'],rows:[{segment:'A',amount:'8'},{segment:'A',amount:'8'}],estimatedTotal:2,sampled:false};
 const e=evaluatePreview(source,generated);
 assert.equal(e.schemaMatch,false);
 assert.equal(e.noveltyPct,100);
 assert.equal(e.numericInRangePct,0);
 assert.equal(e.categoryCoveragePct,33.3);
});
test('empty or missing datasets fail rather than showing misleading metrics',()=>{
 assert.throws(()=>evaluatePreview({columns:['x'],rows:[],estimatedTotal:0,sampled:false},{columns:['x'],rows:[{x:'1'}],estimatedTotal:1,sampled:false}),/nonempty/);
});
