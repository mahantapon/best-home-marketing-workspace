import test from 'node:test';
import assert from 'node:assert/strict';
import {METRICS,newReview,newState,sampleReview,metricResult,summarize,validateBackup,exportCsv,csvCell,dateValid} from './core.mjs';

test('แบบว่างไม่มีคะแนน ไม่แปลงช่องว่างเป็นศูนย์',()=>{const s=summarize(newReview('2026-11-16'));assert.equal(s.score,null);assert.equal(s.coverage,0);assert.equal(s.pendingCount,5);});
test('คำนวณตัวอย่างทั้งห้าด้านตามน้ำหนัก',()=>{const s=summarize(sampleReview());assert.ok(Math.abs(s.score-92.77777777777777)<1e-9);assert.equal(s.coverage,100);assert.equal(s.partial,false);});
test('ผลจริงศูนย์มีคะแนนศูนย์และถือว่ามีข้อมูล',()=>{const r=newReview();r.metrics.delivery.numerator='0';r.metrics.delivery.denominator='10';const s=summarize(r);assert.equal(s.score,0);assert.equal(s.coverage,30);assert.equal(s.validCount,1);});
test('ผลเกินเป้าไม่ทำให้คะแนนเกินน้ำหนัก',()=>{const r=sampleReview();r.metrics.growth.numerator='10';assert.equal(summarize(r).rows[4].earned,10);});
test('N/A ตัดน้ำหนักและระบุความครอบคลุม',()=>{const r=sampleReview();r.metrics.growth.na=true;const s=summarize(r);assert.equal(s.coverage,90);assert.equal(s.naCount,1);assert.equal(s.partial,true);assert.ok(Math.abs(s.score-(87.77777777777777/90*100))<1e-9);});
test('N/A ทุกด้านต้องไม่มีคะแนน',()=>{const r=sampleReview();METRICS.forEach(m=>r.metrics[m.id].na=true);assert.equal(summarize(r).score,null);});
test('ตัวหารศูนย์ ผลเกินทั้งหมด และจำนวนลบไม่ผ่าน',()=>{const row={numerator:'2',denominator:'0',weight:'30',target:'90',na:false};assert.equal(metricResult(METRICS[0],row).status,'invalid');row.denominator='1';assert.equal(metricResult(METRICS[0],row).status,'invalid');row.numerator='-1';assert.equal(metricResult(METRICS[0],row).status,'invalid');});
test('ผลจริงต้องเป็นจำนวนเต็ม',()=>{const r=sampleReview();r.metrics.quality.numerator='53.5';assert.equal(summarize(r).score,null);});
test('น้ำหนักไม่รวม 100 หรือเป้า 0 จะไม่สรุปคะแนน',()=>{const r=sampleReview();r.metrics.delivery.weight='35';assert.equal(summarize(r).score,null);r.metrics.delivery.weight='30';r.metrics.quality.target='0';assert.equal(summarize(r).score,null);});
test('วันที่สิ้นสุดก่อนวันเริ่มต้องเตือน',()=>{const r=sampleReview();r.end='2025-01-01';assert.equal(summarize(r).score,null);assert.ok(summarize(r).dateError);assert.equal(dateValid('2026-02-30'),false);});
test('สำรองและนำเข้าคงตัวเลข ช่องว่าง และ N/A',()=>{const state=newState();state.reviews=[sampleReview()];state.currentId=state.reviews[0].id;state.reviews[0].metrics.quality.na=true;assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(state))),state);});
test('คืนค่ารอบที่ยังกรอกวันที่ไม่ครบโดยไม่ทำข้อมูลอื่นหาย',()=>{const state=newState();state.reviews[0].start='';assert.equal(validateBackup(state).reviews[0].start,'');});
test('ไฟล์นำเข้าผิดรุ่น ขาดข้อมูล หรือตัวเลขผิดชนิดถูกปฏิเสธ',()=>{assert.throws(()=>validateBackup({version:2,reviews:[]}));const s=newState();delete s.reviews[0].metrics.quality;assert.throws(()=>validateBackup(s));const x=newState();x.reviews[0].metrics.quality.target={};assert.throws(()=>validateBackup(x));});
test('CSV มี BOM และป้องกันสูตรจากข้อความผู้ใช้',()=>{const r=sampleReview();r.name='=HYPERLINK("https://example.com")';const csv=exportCsv(r);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'=HYPERLINK"));assert.equal(csvCell('+SUM(A1)'),`"'+SUM(A1)"`);assert.equal(csvCell('hello,"world"'),`"hello,""world"""`);});
