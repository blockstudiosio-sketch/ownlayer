import test from 'node:test';
import assert from 'node:assert/strict';
import {profileColumns,compareSchema} from '../src/schema.ts';
const preview=(columns,rows,sampled=false)=>({columns,rows,estimatedTotal:sampled?null:rows.length,sampled});
test('column profile infers numbers, boolean, dates and text without mutating input',()=>{
 const p=preview(['amount','active','created','code'],[{amount:'1.5',active:'true',created:'2026-11-01',code:'00123'},{amount:'2',active:'false',created:'2026-11-02',code:'00234'}]);
 const result=profileColumns(p);
 assert.deepEqual(result.map(x=>x.inferredType),['number','boolean','date','text']);
 assert.equal(result[0].min,1.5);
 assert.equal(result[0].max,2);
 assert.equal(result[3].distinct,2);
 assert.equal(p.rows[0].amount,'1.5');
});
test('schema drift detects removed columns, type changes, and missingness drift',()=>{
 const old=preview(['a','b','c'],[{a:'1',b:'ok',c:'yes'},{a:'2',b:'ok',c:'no'}]);
 const next=preview(['a','b','d'],[{a:'text',b:'',d:'x'},{a:'text',b:'',d:'y'}]);
 const result=compareSchema(old,next);
 assert.deepEqual(result.addedColumns,['d']);
 assert.deepEqual(result.removedColumns,['c']);
 assert.deepEqual(result.changedTypes,[{column:'a',before:'number',after:'text'},{column:'b',before:'text',after:'empty'}]);
 assert.equal(result.missingRateChanges[0].deltaPct,100);
 assert.equal(result.compatible,false);
});
test('additive columns alone remain compatible',()=>{
 const old=preview(['a'],[{a:'1'}]);
 const next=preview(['a','new'],[{a:'2',new:'x'}]);
 assert.equal(compareSchema(old,next).compatible,true);
});
test('sampled data and invalid thresholds are rejected',()=>{
 const old=preview(['a'],[{a:'1'}]);
 assert.throws(()=>compareSchema(preview(['a'],[{a:'1'}],true),old),/complete/);
 assert.throws(()=>compareSchema(old,old,-1),/threshold/);
});
