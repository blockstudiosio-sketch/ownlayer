import test from 'node:test';
import assert from 'node:assert/strict';
import {parseText,toCsv} from '../src/parse.ts';

test('quoted delimiters, CRLF and escaped quotes are parsed losslessly',()=>{
 const p=parseText('name,notes\r\nAlice,"Hello, ""world"""\r\nBob,"line 1\nline 2"\r\n','csv');
 assert.equal(p.rows.length,2);
 assert.equal(p.rows[0].notes,'Hello, "world"');
 assert.equal(p.rows[1].notes,'line 1\nline 2');
});
test('unexpected quotes and trailing garbage fail closed',()=>{
 for(const text of ['a,b\nhello"bad,world','a,b\n"hello"bad,world','a,b\n"unterminated,world']){
  assert.throws(()=>parseText(text,'csv'),/quotation|quoted/);
 }
});
test('surplus cells are rejected instead of silently discarded',()=>{
 assert.throws(()=>parseText('a,b\n1,2,3','csv'),/more fields/);
 assert.deepEqual(parseText('a,b\n1','csv').rows,[{a:'1',b:''}]);
});
test('missing headers and excessive columns are rejected',()=>{
 assert.throws(()=>parseText('','csv'),/header/);
 assert.throws(()=>parseText(Array.from({length:501},(_,i)=>'col'+i).join(',')+'\n','csv'),/500-column/);
});
test('CSV export neutralizes spreadsheet formula execution in data cells',()=>{
 const output=toCsv(['label','safe'],[{label:'=HYPERLINK("http://example.test")',safe:'+SUM(1,2)'},{label:' @cmd',safe:'normal'}]);
 assert.match(output,/^label,safe\r\n/);
 assert.match(output,/'=HYPERLINK/);
 assert.match(output,/'\+SUM/);
 assert.match(output,/' @cmd/);
 assert.match(output,/normal/);
 const injected=toCsv(['  =danger','-danger','@danger'],[{'  =danger':'  =1+1','-danger':'-2+3','@danger':'@SUM(1)'}]);
 assert.match(injected,/'  =1\+1/);
 assert.match(injected,/'-2\+3/);
 assert.match(injected,/'@SUM/);
 assert.match(toCsv(['tab'],[{tab:'\t=SUM(1)'}]),/'\t=SUM/);
});
