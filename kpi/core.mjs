export const STORAGE_KEY = 'best-home.kpi.v1';
export const METRICS = [
  {id:'delivery',name:'ส่งงานครบตามแผน',weight:30,target:90,kind:'ratio',unit:'งาน',help:'งานที่ส่งครบตามบรีฟภายในรอบ ÷ งานที่ตกลงให้ส่งในรอบ'},
  {id:'quality',name:'คุณภาพงาน',weight:30,target:90,kind:'ratio',unit:'ข้อ',help:'ข้อเช็กลิสต์ที่ผ่านในการตรวจร่างครั้งแรก ÷ ข้อที่ใช้ตรวจทั้งหมด'},
  {id:'ontime',name:'ส่งร่างตรงเวลา',weight:20,target:90,kind:'ratio',unit:'งาน',help:'งานที่ส่งร่างครบภายในกำหนด ÷ งานที่ถึงกำหนดส่งร่าง'},
  {id:'system',name:'จัดเก็บและติดตามงาน',weight:10,target:100,kind:'ratio',unit:'รายการ',help:'รายการข้อมูลและไฟล์ที่ครบตามกำหนด ÷ รายการที่ต้องมี'},
  {id:'growth',name:'พัฒนาวิธีทำงาน',weight:10,target:2,kind:'count',unit:'เรื่อง',help:'การปรับปรุงที่นำไปใช้จริง พร้อมหลักฐานก่อน–หลัง ในรอบ 4 สัปดาห์'}
];
export const TYPES = {short:'คลิปสั้น',image:'ภาพเดี่ยว',album:'อัลบั้ม / คารูเซล',adapt:'ปรับเวอร์ชัน',shoot:'ถ่ายทำ',long:'คลิปยาว',other:'งานอื่น'};
export const STATUSES = {planned:'รอเริ่ม',doing:'กำลังทำ',review:'รอตรวจ',done:'ส่งครบแล้ว',blocked:'รอข้อมูล / วัตถุดิบ',deferred:'เลื่อนตามข้อตกลง'};
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function addDays(iso,n){const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function dateValid(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(`${s}T12:00:00Z`).toISOString().slice(0,10)===s;}
export function newReview(start=today()){
  return {id:uid(),name:'',reviewer:'',start,end:addDays(start,27),phase:'baseline',sample:false,
    metrics:Object.fromEntries(METRICS.map(m=>[m.id,{numerator:'',denominator:'',target:String(m.target),weight:String(m.weight),na:false,evidence:''}])),
    strengths:'',improvements:'',support:'',tasks:[]};
}
export function newState(){const r=newReview();return {version:1,currentId:r.id,reviews:[r]};}
export function numberValue(value){if(value===''||value===null||value===undefined||typeof value==='boolean')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
export function metricResult(def,row){
  const weight=numberValue(row.weight),target=numberValue(row.target);
  if(weight===null||weight<0||weight>100)return {status:'invalid',error:'น้ำหนักต้องอยู่ระหว่าง 0–100',weight:0};
  if(target===null||target<=0||target>(def.kind==='ratio'?100:10000))return {status:'invalid',error:'ระบุเป้าหมายให้มากกว่า 0'+(def.kind==='ratio'?' และไม่เกิน 100%':''),weight};
  if(row.na)return {status:'na',weight};
  const n=numberValue(row.numerator),d=numberValue(row.denominator);
  if(n===null||(def.kind==='ratio'&&d===null))return {status:'pending',weight};
  if(!Number.isInteger(n)||n<0||n>10000)return {status:'invalid',error:'ผลจริงต้องเป็นจำนวนเต็ม 0–10,000',weight};
  if(def.kind==='ratio'&&(!Number.isInteger(d)||d<=0||d>10000))return {status:'invalid',error:'ตัวหารต้องเป็นจำนวนเต็มมากกว่า 0; หากไม่มีงานให้เลือก N/A',weight};
  if(def.kind==='ratio'&&n>d)return {status:'invalid',error:'จำนวนที่ผ่านต้องไม่เกินจำนวนทั้งหมด',weight};
  const actual=def.kind==='ratio'?100*n/d:n;
  return {status:'valid',weight,target,actual,earned:weight*Math.min(actual/target,1),met:actual>=target};
}
export function summarize(review){
  const rows=METRICS.map(m=>({...metricResult(m,review.metrics[m.id]),id:m.id}));
  const totalWeight=rows.reduce((n,r)=>n+r.weight,0);
  const weightValid=Math.abs(totalWeight-100)<0.000001;
  const dateError=!dateValid(review.start)||!dateValid(review.end)?'ระบุวันเริ่มและวันสิ้นสุดให้ครบ':review.end<review.start?'วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่ม':'';
  const valid=rows.filter(r=>r.status==='valid');
  const coverage=valid.reduce((n,r)=>n+r.weight,0);
  const earned=valid.reduce((n,r)=>n+r.earned,0);
  const invalid=rows.some(r=>r.status==='invalid');
  const usable=weightValid&&!dateError&&!invalid;
  return {rows,totalWeight,weightValid,dateError,invalid,coverage,earned,score:usable&&coverage>0?earned/coverage*100:null,validCount:valid.length,naCount:rows.filter(r=>r.status==='na').length,pendingCount:rows.filter(r=>r.status==='pending').length,partial:coverage<100,usable};
}
export function sampleReview(){
  const r=newReview();r.name='ตัวอย่างสมมติ';r.reviewer='ตัวอย่างผู้ประเมิน';r.sample=true;
  [[9,10],[54,60],[8,10],[20,20],[1,'']].forEach(([n,d],i)=>{const m=r.metrics[METRICS[i].id];m.numerator=String(n);m.denominator=String(d);m.evidence='ข้อมูลตัวอย่างเพื่อทดลองคำนวณ ไม่ใช่ผลประเมินจริง';});
  r.strengths='ตัวอย่าง: ส่งมอบงานครบและจัดเก็บไฟล์เป็นระบบ';r.improvements='ตัวอย่าง: ฝึกจัดลำดับงานเพื่อส่งร่างให้ทันกำหนด';r.support='ตัวอย่าง: ผู้ประเมินรวบรวมข้อเสนอแนะเป็นชุดเดียว';return r;
}
const safeString=(v,max=3000)=>{if(typeof v!=='string'||v.length>max)throw new Error('รูปแบบข้อความในไฟล์ไม่ถูกต้อง');return v;};
export function validateBackup(raw){
  if(!raw||raw.version!==1||!Array.isArray(raw.reviews)||!raw.reviews.length||raw.reviews.length>100)throw new Error('เลือกไฟล์สำรอง KPI เวอร์ชัน 1 ที่มี 1–100 รอบประเมิน');
  const seen=new Set();
  const reviews=raw.reviews.map(src=>{
    if(!src||typeof src!=='object')throw new Error('ข้อมูลรอบประเมินไม่ถูกต้อง');
    const r=newReview();r.id=safeString(src.id,100);if(!r.id||seen.has(r.id))throw new Error('รหัสรอบประเมินว่างหรือซ้ำ');seen.add(r.id);
    r.name=safeString(src.name,120);r.reviewer=safeString(src.reviewer,120);r.start=safeString(src.start,10);r.end=safeString(src.end,10);
    if((r.start&&!dateValid(r.start))||(r.end&&!dateValid(r.end)))throw new Error('รูปแบบวันที่ในไฟล์ไม่ถูกต้อง');
    if(!['baseline','assessment'].includes(src.phase))throw new Error('โหมดประเมินไม่ถูกต้อง');r.phase=src.phase;r.sample=src.sample===true;
    for(const def of METRICS){const s=src.metrics?.[def.id];if(!s||typeof s.na!=='boolean')throw new Error('ข้อมูล KPI ไม่ครบ');
      const m=r.metrics[def.id];for(const key of ['numerator','denominator','target','weight']){m[key]=safeString(s[key],30);if(m[key]!==''&&(!Number.isFinite(Number(m[key]))||Number(m[key])<0||Number(m[key])>10000))throw new Error('ตัวเลข KPI ในไฟล์ไม่ถูกต้อง');}
      m.na=s.na;m.evidence=safeString(s.evidence);}
    for(const key of ['strengths','improvements','support'])r[key]=safeString(src[key]);
    if(!Array.isArray(src.tasks)||src.tasks.length>200)throw new Error('รายการงานไม่ถูกต้องหรือเกิน 200 งาน');
    const taskIds=new Set();r.tasks=src.tasks.map(t=>{const task={};for(const [key,max] of Object.entries({id:100,title:200,type:30,status:30,due:10,actual:10,hours:20,notes:3000})){task[key]=safeString(t[key],max);}
      if(!task.id||taskIds.has(task.id)||!task.title.trim())throw new Error('รหัสหรือชื่องานไม่ถูกต้อง');taskIds.add(task.id);
      if(!TYPES[task.type]||!STATUSES[task.status]||(task.due&&!dateValid(task.due))||(task.actual&&!dateValid(task.actual)))throw new Error('ชนิด สถานะ หรือวันที่ของงานไม่ถูกต้อง');
      if(task.hours!==''&&(numberValue(task.hours)===null||Number(task.hours)<0||Number(task.hours)>1000))throw new Error('เวลางานไม่ถูกต้อง');return task;});
    return r;
  });
  return {version:1,currentId:reviews.some(r=>r.id===raw.currentId)?raw.currentId:reviews[0].id,reviews};
}
export function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function csvCell(v){let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function exportCsv(review){
  const sum=summarize(review);
  const lines=[['ผู้รับการประเมิน','ผู้ประเมิน','วันเริ่ม','วันสิ้นสุด','โหมด','หัวข้อ','น้ำหนัก','เป้าหมาย','ทำได้','ทั้งหมด','ผลจริง','คะแนนถ่วงน้ำหนัก','สถานะ','หลักฐาน']];
  METRICS.forEach((m,i)=>{const r=review.metrics[m.id],s=sum.rows[i];lines.push([review.name,review.reviewer,review.start,review.end,review.phase==='baseline'?'เก็บข้อมูลฐาน':'ประเมินตามข้อตกลง',m.name,r.weight,r.target,r.numerator,m.kind==='count'?'':r.denominator,s.actual===undefined?'':s.actual.toFixed(2),s.earned===undefined?'':s.earned.toFixed(2),{valid:'มีข้อมูล',pending:'รอข้อมูล',na:'ไม่ใช้ในรอบนี้',invalid:'ตรวจข้อมูล'}[s.status],r.evidence]);});
  lines.push([],['สรุป','คะแนนจากข้อมูลที่มี',sum.score===null?'รอข้อมูล':sum.score.toFixed(2),'น้ำหนักที่มีข้อมูล',sum.coverage,'จาก',100],['สิ่งที่ทำได้ดี',review.strengths],['สิ่งที่จะพัฒนา',review.improvements],['สิ่งที่หัวหน้าจะช่วย',review.support],[],['รายการงาน','ประเภท','สถานะ','กำหนดส่งร่าง','ส่งร่างจริง','ชั่วโมง','เหตุที่ติดขัด / บันทึก']);
  review.tasks.forEach(t=>lines.push([t.title,TYPES[t.type],STATUSES[t.status],t.due,t.actual,t.hours,t.notes]));
  return '\uFEFF'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
