// One record per original asset, shared by roadmap and every review period.
export const CHECKS = ['ตรงบรีฟและสารหลัก','ข้อมูลและภาพจริงถูกต้อง','ตรงมาตรฐานแบรนด์','ข้อความและซับอ่านง่าย','คุณภาพภาพ / เสียง','ไฟล์และขนาดครบ'];
export const STATUSES = {planned:'รอเริ่ม',doing:'กำลังผลิต',review:'รอตรวจ',done:'ส่งครบแล้ว',blocked:'ติดขัด',deferred:'พักตามข้อตกลง'};
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function newRecord(){return {status:'planned',included:false,due:'',finalDue:'',actual:'',completed:'',hours:'',file:'',notes:'',exclusion:'',quality:Array(6).fill(''),filesPassed:'',filesTotal:'',updatedAt:''};}
export function validateRecord(src){
 const r=newRecord();if(!src||typeof src!=='object'||Array.isArray(src))throw Error('ข้อมูล Roadmap ไม่ถูกต้อง');
 for(const k of ['status','due','finalDue','actual','completed','hours','file','notes','exclusion','filesPassed','filesTotal','updatedAt']){
  if(typeof src[k]!=='string'||src[k].length>3000)throw Error('ข้อมูล Roadmap ไม่ครบ');r[k]=src[k];
 }
 if(!STATUSES[r.status]||typeof src.included!=='boolean')throw Error('สถานะ Roadmap ไม่ถูกต้อง');r.included=src.included;
 for(const k of ['due','finalDue','actual','completed'])if(r[k]&&!validDate(r[k]))throw Error('วันที่งานไม่ถูกต้อง');
 if(r.due&&r.finalDue&&r.due>r.finalDue)throw Error('วันส่งร่างต้องไม่อยู่หลังวันส่งครบ');
 if(r.actual&&r.completed&&r.actual>r.completed)throw Error('วันส่งครบต้องไม่อยู่ก่อนวันส่งร่างจริง');
 for(const k of ['hours','filesPassed','filesTotal'])if(r[k]!==''&&(!Number.isFinite(Number(r[k]))||Number(r[k])<0||Number(r[k])>10000))throw Error('ตัวเลขงานไม่ถูกต้อง');
 for(const k of ['filesPassed','filesTotal'])if(r[k]!==''&&!Number.isInteger(Number(r[k])))throw Error('จำนวนรายการต้องเป็นจำนวนเต็ม');
 if(r.filesPassed!==''&&r.filesTotal!==''&&Number(r.filesPassed)>Number(r.filesTotal))throw Error('จำนวนรายการครบต้องไม่เกินทั้งหมด');
 if(!Array.isArray(src.quality)||src.quality.length!==6||src.quality.some(q=>!['','pass','fail','na'].includes(q)))throw Error('เช็กลิสต์คุณภาพไม่ถูกต้อง');r.quality=[...src.quality];
 if(r.included&&(!r.due||!r.finalDue))throw Error('ระบุวันส่งร่างและวันส่งครบก่อนนับ KPI');
 if(r.status==='done'&&!r.completed)throw Error('ระบุวันส่งครบจริงก่อนเลือกส่งครบแล้ว');
 if(r.status==='deferred'&&!r.exclusion.trim())throw Error('ระบุเหตุผลและข้อตกลงที่พักงาน');
 if(r.completed&&!r.actual)throw Error('ระบุวันส่งร่างจริงก่อนวันส่งครบ');
 if(r.quality.some(q=>q!=='')&&!r.actual)throw Error('ระบุวันส่งร่างจริงก่อนตรวจคุณภาพ');
 return r;
}
export function deriveReview(review,plans,records={},asOf){
 const result={...review,metrics:structuredClone(review.metrics)};
 const cutoff=[asOf,review.end].sort()[0];
 const validRange=validDate(review.start)&&validDate(review.end)&&review.start<=review.end&&validDate(cutoff);
 const period=d=>validRange&&validDate(d)&&d>=review.start&&d<=cutoff;
 const data=plans.map(p=>({...p,record:records[p.id]||newRecord()}));
 const eligible=data.filter(t=>t.record.included&&!(t.record.status==='deferred'&&t.record.exclusion.trim()));
 const deliveries=eligible.filter(t=>period(t.record.finalDue));
 const drafts=eligible.filter(t=>period(t.record.due));
 const reviewed=eligible.filter(t=>period(t.record.due)&&t.record.actual&&t.record.actual<=cutoff);
 const quality=reviewed.flatMap(t=>t.record.quality).filter(q=>['pass','fail'].includes(q));
 const pendingReview=reviewed.filter(t=>t.record.quality.includes('')).length;
 const fileRows=deliveries.filter(t=>t.record.filesPassed!==''&&t.record.filesTotal!=='');
 const pendingFiles=deliveries.length-fileRows.length;
 function set(id,n,d){const m=result.metrics[id];m.numerator=d?String(n):'';m.denominator=d?String(d):'';m.na=false;m.evidence=`Roadmap · ${review.start} ถึง ${cutoff} · นับตามกำหนดส่งที่ตกลง ไม่ใช่วันเผยแพร่`;}
 set('delivery',deliveries.filter(t=>t.record.completed&&t.record.completed<=cutoff).length,deliveries.length);
 set('ontime',drafts.filter(t=>t.record.actual&&t.record.actual<=t.record.due&&t.record.actual<=cutoff).length,drafts.length);
 set('quality',quality.filter(q=>q==='pass').length,quality.length);
 if(reviewed.length&&!pendingReview&&!quality.length)result.metrics.quality.na=true;
 set('system',fileRows.reduce((s,t)=>s+Number(t.record.filesPassed),0),fileRows.reduce((s,t)=>s+Number(t.record.filesTotal),0));
 if(fileRows.length&&!pendingFiles&&fileRows.every(t=>Number(t.record.filesTotal)===0))result.metrics.system.na=true;
 return {review:result,pendingReview,pendingFiles,eligible:eligible.length,deliveryCount:deliveries.length,draftCount:drafts.length,cutoff};
}
