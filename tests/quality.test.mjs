import test from 'node:test';
import assert from 'node:assert/strict';
import {qualityReport} from '../src/quality.ts';

test('profiles missingness, duplicates, types and numeric range from full records',()=>{
 const preview={columns:['zone','temperature','active','date'],rows:[
 {zone:'North',temperature:'22',active:'true',date:'2026-10-01'},
 {zone:'North',temperature:'22',active:'true',date:'2026-10-01'},
 {zone:'South',temperature:'',active:'false',date:'2026-10-03'},
 {zone:'',temperature:'30',active:'true',date:'2026-10-04'}
 ],estimatedTotal:4,sampled:false};
 const report=qualityReport(preview);
 assert.equal(report.rows,4);assert.equal(report.duplicateRows,1);
 assert.equal(report.missingCells,2);assert.equal(report.completenessPct,87.5);
 assert.deepEqual(report.columnQuality.map(c=>c.inferredType),['text','number','boolean','date']);
 assert.equal(report.columnQuality[1].missingPct,25);
 assert.equal(report.columnQuality[1].min,22);assert.equal(report.columnQuality[1].max,30);
 assert.equal(report.columnQuality[0].distinct,2);
});
test('rejects incomplete previews and duplicate column names',()=>{
 const p={columns:['x'],rows:[{x:'1'}],estimatedTotal:1,sampled:true};
 assert.throws(()=>qualityReport(p),/complete unsampled/);
 assert.throws(()=>qualityReport({...p,sampled:false,estimatedTotal:2}),/complete unsampled/);
 assert.throws(()=>qualityReport({...p,sampled:false,columns:['x','x']}),/Duplicate column/);
});
test('empty full datasets are handled without NaN',()=>{
 const r=qualityReport({columns:['x'],rows:[],estimatedTotal:0,sampled:false});
 assert.equal(r.completenessPct,100);assert.equal(r.columnQuality[0].inferredType,'empty');
 assert.equal(r.columnQuality[0].missingPct,100);
});
