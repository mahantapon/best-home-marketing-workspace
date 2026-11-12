export const GROUPS = {
  A: { title:'ทำก่อน', description:'ด่วนและสำคัญ', action:'เก้าตัดสินใจและคุมให้เดิน', order:0 },
  B: { title:'มอบหมาย', description:'ด่วน แต่สำคัญต่อเป้าหมายหลักน้อยกว่า', action:'กระจายงานตามบทบาท', order:2 },
  C: { title:'วางแผน', description:'สำคัญ แต่ยังไม่ด่วน', action:'กันเวลาไว้เพื่อพัฒนาทีม', order:1 },
  D: { title:'พักไว้', description:'ไม่ด่วน และยังไม่ใช่เป้าหมายหลัก', action:'ลดขอบเขตหรือรอจังหวะ', order:3 }
};
export const STATUSES = {unreviewed:'รอตรวจสถานะ',planned:'รอจัดคิว',in_progress:'กำลังทำ',waiting:'รอข้อมูล',done:'เสร็จแล้ว',paused:'พักไว้'};
export const STORE_KEY='best-home-marketing-workspace:v1';
export const BACKUP_APP='best-home-marketing-workspace';
export function escapeHTML(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function validatePatch(patch){
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('รูปแบบรายการแก้ไขไม่ถูกต้อง');
 const clean={};const allowed=new Set(['status','group','rank','owner','due','notes','focus']);
 for(const [key,value]of Object.entries(patch)){
  if(!allowed.has(key))throw new Error('มีช่องข้อมูลที่ไม่รองรับ');
  if(key==='status'&&!Object.hasOwn(STATUSES,value))throw new Error('สถานะไม่ถูกต้อง');
  if(key==='group'&&!Object.hasOwn(GROUPS,value))throw new Error('กลุ่มงานไม่ถูกต้อง');
  if(key==='rank'&&(!Number.isInteger(value)||value<1||value>999))throw new Error('ลำดับต้องเป็นเลข 1–999');
  if(key==='focus'&&typeof value!=='boolean')throw new Error('ข้อมูลโฟกัสไม่ถูกต้อง');
  if(['owner','notes','due'].includes(key)&&typeof value!=='string')throw new Error('ช่องข้อความไม่ถูกต้อง');
  if(key==='owner'&&(!value.trim()||value.length>150))throw new Error('ระบุผู้รับผิดชอบไม่เกิน 150 ตัวอักษร');
  if(key==='notes'&&value.length>5000)throw new Error('บันทึกยาวเกิน 5,000 ตัวอักษร');
  if(key==='due'&&value!==''){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw new Error('วันที่ไม่ถูกต้อง');
  }
  clean[key]=key==='owner'?value.trim():value;
 }
 return clean;
}
export function validateOverrides(value,knownTasks){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('ข้อมูลแก้ไขต้องเป็นรายการงาน');
 const ids=new Set(knownTasks.map(t=>t.id));const clean={};
 for(const [id,patch]of Object.entries(value)){if(!ids.has(id))throw new Error('พบรหัสงานที่ไม่ตรงกับแผนนี้: '+id);clean[id]=validatePatch(patch);}
 return clean;
}
export function applyOverrides(tasks,overrides){return tasks.map(t=>({...t,...(Object.hasOwn(overrides,t.id)?overrides[t.id]:{})}));}
export function matchesOwner(task,owner){const text=task.owner.toLowerCase();if(owner==='kao')return text.includes('เก้า');if(owner==='junior')return text.includes('น้อง');if(owner==='external')return /outsource|ผู้ดูแล|ผู้พัฒนา/.test(text);if(owner==='support')return /admin|ขาย|operations|บัญชี|pm|site/.test(text);return true;}
export function queryTasks(tasks,{query='',group='all',owner='all',status='all',sort='priority',focus=false}={}){
 const q=query.trim().toLocaleLowerCase('th');
 return tasks.filter(t=>(group==='all'||t.group===group)&&(status==='all'||t.status===status)&&matchesOwner(t,owner)&&(!focus||(t.focus&&t.status!=='done'&&t.status!=='paused'))&&(!q||[t.id,t.title,t.owner,t.outcome,t.reason,t.notes].join(' ').toLocaleLowerCase('th').includes(q))).sort((a,b)=>{
  if(sort==='due'){const due=(a.due||'9999').localeCompare(b.due||'9999');if(due)return due;}
  return GROUPS[a.group].order-GROUPS[b.group].order||a.rank-b.rank||a.id.localeCompare(b.id,undefined,{numeric:true});
 });
}
export function categoryCounts(tasks){return Object.fromEntries(Object.keys(GROUPS).map(g=>[g,tasks.filter(t=>t.group===g).length]));}
export function parseBackup(text,tasks){const data=JSON.parse(text);if(data.app!==BACKUP_APP||data.schemaVersion!==1)throw new Error('ไฟล์นี้ไม่ใช่ข้อมูลสำรองของ Marketing Workspace เวอร์ชันนี้');return validateOverrides(data.overrides,tasks);}
export function makeBackup(overrides){return {app:BACKUP_APP,schemaVersion:1,exportedAt:new Date().toISOString(),overrides};}
export function toCSV(tasks){
 const cell=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const rows=[['รหัส','กลุ่ม','ลำดับในกลุ่ม','งาน','ผู้รับผิดชอบ','สถานะ','กำหนดส่ง','ผลลัพธ์','เงื่อนไข','บันทึก'],...tasks.map(t=>[t.id,t.group,t.rank,t.title,t.owner,STATUSES[t.status],t.due,t.outcome,t.reason,t.notes])];
 return '\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
}
