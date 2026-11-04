import test from 'node:test';
import assert from 'node:assert/strict';
import {assertNoDescendants,traceLineage} from '../src/lineage.ts';
const record=(id,parentId=null)=>({id,name:id+'.csv',parentId,createdAt:1});
test('prevents deleting ancestors of derived datasets, including grandchildren',()=>{
 const records=[record('root'),record('clean','root'),record('synthetic','clean')];
 assert.throws(()=>assertNoDescendants('root',records),/2 derived dataset\(s\)/);
 assert.throws(()=>assertNoDescendants('clean',records),/synthetic\.csv/);
 assert.doesNotThrow(()=>assertNoDescendants('synthetic',records));
});
test('handles broken references and cycles without unbounded traversal',()=>{
 const records=[record('a','b'),record('b','a'),record('orphan','missing')];
 assert.equal(traceLineage('a',records).complete,false);
 assert.throws(()=>assertNoDescendants('a',records),/derived dataset/);
 assert.doesNotThrow(()=>assertNoDescendants('orphan',records));
});
test('independent datasets are deletable',()=>{
 assert.doesNotThrow(()=>assertNoDescendants('one',[record('one'),record('two')]));
});
