import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData} from '../data.js';
import {applyOverrides,queryTasks,categoryCounts,validatePatch,parseBackup,makeBackup,toCSV,escapeHTML} from '../core.js';
test('the complete priority inventory retains 59 tasks, 16 history records and the recommended starting queue',()=>{
 assert.equal(initialData.tasks.length,59);assert.equal(initialData.history.length,16);
 assert.equal(new Set(initialData.tasks.map(t=>t.id)).size,59);
 assert.deepEqual(categoryCounts(initialData.tasks),{A:8,B:12,C:31,D:8});
 assert.deepEqual(queryTasks(initialData.tasks,{focus:true}).map(t=>t.id),['A1','A2','A3','A4','A5','A6','A7','A8','C1','C2']);
 assert(initialData.tasks.every(t=>t.status==='unreviewed'&&t.due===''));
});
test('a real edit changes board counts, priority order, search and focus without mutating source data',()=>{
 const edited=applyOverrides(initialData.tasks,{A1:{group:'C',rank:90,owner:'น้อง',status:'done',due:'2026-11-20',notes:'ทดสอบการมอบหมาย'}});
 assert.deepEqual(categoryCounts(edited),{A:7,B:12,C:32,D:8});
 assert(!queryTasks(edited,{focus:true}).some(t=>t.id==='A1'));
 assert.equal(queryTasks(edited,{query:'ทดสอบการมอบหมาย',owner:'junior',status:'done'})[0].id,'A1');
 assert.equal(queryTasks(edited,{sort:'due'})[0].id,'A1');
 assert.equal(initialData.tasks[0].group,'A');assert.equal(initialData.tasks[0].status,'unreviewed');
});
test('backups round-trip and reject unknown records, wrong schema and invalid dates',()=>{
 const overrides={A2:{status:'waiting',group:'A',rank:2,owner:'เก้า',due:'2026-11-30',notes:'รอข้อมูล',focus:true}};
 assert.deepEqual(parseBackup(JSON.stringify(makeBackup(overrides)),initialData.tasks),overrides);
 assert.throws(()=>parseBackup('{"app":"other","schemaVersion":1,"overrides":{}}',initialData.tasks));
 assert.throws(()=>parseBackup(JSON.stringify(makeBackup({UNKNOWN:{status:'done'}})),initialData.tasks));
 assert.throws(()=>validatePatch({due:'2026-02-30'}));assert.throws(()=>validatePatch({rank:0}));
 assert.throws(()=>validatePatch({title:'replace source'}));assert.throws(()=>validatePatch({status:'invented'}));
 assert.equal(validatePatch({due:''}).due,'');
});
test('user-entered notes stay text and spreadsheet exports guard formula injection',()=>{
 assert.equal(escapeHTML('<script>alert("x")</script>'),'&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
 const csv=toCSV([{...initialData.tasks[0],owner:'=1+2',notes:'line 1\n"quoted"'}]);
 assert(csv.startsWith('\uFEFF'));assert(csv.includes('"\'=1+2"'));assert(csv.includes('"line 1\n""quoted"""'));
});
