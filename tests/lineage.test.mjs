import test from 'node:test';
import assert from 'node:assert/strict';
import {traceLineage} from '../src/lineage.ts';
const record=(id,parentId=null,createdAt=0)=>({id,name:id,parentId,createdAt});
test('traces all ancestors and transitive descendants without mutating input',()=>{
 const data=[record('root'),record('clean','root',1),record('synthetic','clean',2),record('sibling','root',3)];
 const trace=traceLineage('synthetic',data);
 assert.deepEqual(trace.nodes.map(n=>n.kind==='dataset'?n.dataset.id:n.id),['synthetic','clean','root']);
 assert.deepEqual(trace.descendants,[]);
 assert.equal(trace.complete,true);
 const root=traceLineage('root',data);
 assert.deepEqual(root.descendants.map(n=>n.id),['sibling','synthetic','clean']);
 assert.equal(data.length,4);
});
test('missing parent is explicit rather than silently claiming a complete lineage',()=>{
 const trace=traceLineage('child',[record('child','deleted')]);
 assert.deepEqual(trace.nodes.map(n=>n.kind),['dataset','missing']);
 assert.equal(trace.nodes[1].id,'deleted');
 assert.equal(trace.complete,false);
});
test('cycles terminate and report corruption',()=>{
 const trace=traceLineage('a',[record('a','b'),record('b','a'),record('c','a')]);
 assert.deepEqual(trace.nodes.map(n=>n.kind),['dataset','dataset','cycle']);
 assert.deepEqual(trace.descendants.map(n=>n.id),['c','b']);
 assert.equal(trace.complete,false);
});
test('unknown selected id is reported as missing',()=>{
 const trace=traceLineage('unknown',[]);
 assert.equal(trace.nodes[0].kind,'missing');
 assert.equal(trace.complete,false);
});
