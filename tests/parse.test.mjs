import test from 'node:test';
import assert from 'node:assert/strict';
import {parseText,profileOf,cleaned,toCsv} from '../src/parse.ts';

test('CSV handles quotations, embedded newlines, repeated headers and missing values',()=>{
 const p=parseText('code,code,notes\r\n1,2,"hello,\nworld"\r\n1,2,\r\n','csv');
 assert.deepEqual(p.columns,['code','code (2)','notes']);
 assert.equal(p.rows[0].notes,'hello,\nworld');
 assert.equal(p.rows[1].notes,'');
 assert.equal(p.estimatedTotal,2);
 assert.equal(p.sampled,false);
});
test('preview clipping drops partially quoted and partially plain CSV tail rows',()=>{
 const sample='name,city\nA,Hyderabad\nB,"half of quoted field';
 const p=parseText(sample,'csv',true);
 assert.equal(p.rows.length,1);
 assert.equal(p.rows[0].name,'A');
 assert.equal(p.estimatedTotal,null);
 assert.equal(p.sampled,true);
 assert.throws(()=>parseText(sample,'csv',false),/Unclosed quotation/);
 const other=parseText('a,b\n1,2\n2,part','csv',true);
 assert.equal(other.rows.length,1);
});
test('preview clipping ignores incomplete JSONL and text final record',()=>{
 const j=parseText('{"city":"A"}\n{"city":"B"', 'jsonl',true);
 assert.equal(j.rows.length,1);
 assert.equal(j.rows[0].city,'A');
 const txt=parseText('one\ntwo\npar','txt',true);
 assert.equal(txt.rows.length,2);
 assert.equal(txt.rows[1].text,'two');
});
test('large JSON samples remain honest while allowing original upload',()=>{
 const p=parseText('[{"a":1}', 'json',true);
 assert.equal(p.rows.length,0);
 assert.equal(p.sampled,true);
 assert.equal(p.estimatedTotal,null);
 assert.match(p.message,/server-side/);
 const quality=profileOf(p);
 assert.ok(quality.issues.some(message=>message.includes('full-file quality remains unverified')));
});
test('non-destructive dedupe and quoted CSV serialization',()=>{
 const input=parseText('name,details\n Alice ,"a,b"\nAlice,"a,b"\n','csv');
 const original=structuredClone(input.rows);
 const result=cleaned(input,true,true);
 assert.equal(result.length,1);
 assert.deepEqual(input.rows,original);
 assert.equal(toCsv(input.columns,result),'name,details\r\nAlice,"a,b"\r\n');
});
test('JSON object and JSON arrays parsed once into rows',()=>{
 const p=parseText('[{"x":1},{"x":2,"y":true}]','json');
 assert.deepEqual(p.columns,['x','y']);
 assert.deepEqual(p.rows,[{x:'1',y:''},{x:'2',y:'true'}]);
});
