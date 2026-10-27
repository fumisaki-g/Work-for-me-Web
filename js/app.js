const C=window.CONFIG,$=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sb=(C.SUPABASE_URL&&C.SUPABASE_KEY&&window.supabase)?supabase.createClient(C.SUPABASE_URL,C.SUPABASE_KEY):null;

/* ---------- ชั้นฐานข้อมูล: Supabase (ถ้าตั้งค่าแล้ว) หรือ localStorage (โหมดทดลอง) ---------- */
const LS=t=>JSON.parse(localStorage.getItem('d_'+t)||'[]');
const db={
 async list(t){if(sb){const{data,error}=await sb.from(t).select('*').order('created_at');if(error)throw error;return data}return LS(t)},
 async save(t,r,id){
  if(sb){const{error}=await(id?sb.from(t).update(r).eq('id',id):sb.from(t).insert(r));if(error)throw error;return}
  const a=LS(t);if(id){const i=a.findIndex(x=>x.id==id);a[i]={...a[i],...r}}else a.push({...r,id:Date.now(),created_at:new Date().toISOString()});
  localStorage.setItem('d_'+t,JSON.stringify(a))},
 async del(t,id){if(sb){const{error}=await sb.from(t).delete().eq('id',id);if(error)throw error;return}
  localStorage.setItem('d_'+t,JSON.stringify(LS(t).filter(x=>x.id!=id)))}
};
// API ภายนอกอื่น ๆ: await extApi('/endpoint')
window.extApi=async(p,o={})=>{if(!C.EXTRA_API_URL)throw Error('ยังไม่ได้ตั้งค่า EXTRA_API_URL');
 const r=await fetch(C.EXTRA_API_URL+p,{...o,headers:{Authorization:'Bearer '+C.EXTRA_API_KEY,...(o.headers||{})}});return r.json()};

/* ---------- โครงสร้างข้อมูล: [คอลัมน์, ป้ายชื่อ, ชนิด, ตัวเลือก, 1=ไม่บังคับ] ---------- */
const DAYS=[[1,'จันทร์'],[2,'อังคาร'],[3,'พุธ'],[4,'พฤหัสบดี'],[5,'ศุกร์'],[6,'เสาร์'],[7,'อาทิตย์']];
const STAT=[['present','มาเรียนปกติ'],['sick','ลาป่วย'],['personal','ลากิจ'],['other','อื่นๆ']];
const T={
 timetable:{n:'ตารางเรียน',i:'🗓️',f:[['day_no','วัน','select',DAYS],['period','คาบที่','number'],['subject','วิชา'],['room','ห้อง','text',0,1],['teacher','ครูผู้สอน','text',0,1]],sort:(a,b)=>a.day_no-b.day_no||a.period-b.period},
 scores:{n:'คะแนนเก็บ',i:'📝',f:[['subject','วิชา'],['title','รายการ'],['score','คะแนนที่ได้','number'],['max_score','คะแนนเต็ม','number']]},
 files:{n:'ไฟล์เรียน',i:'📁',f:[['title','ชื่อไฟล์'],['subject','วิชา','text',0,1],['url','ลิงก์ไฟล์','url']]},
 contacts:{n:'ช่องทางติดต่อ',i:'📞',f:[['name','ชื่อ'],['role','ตำแหน่ง/วิชา','text',0,1],['phone','เบอร์โทร','text',0,1],['line','LINE / อีเมล / ลิงก์','text',0,1]]},
 attendance:{n:'เช็คชื่อ',i:'✅',f:[['date','วันที่','date'],['status','สถานะ','select',STAT],['reason','เหตุผล','text',0,1]],sort:(a,b)=>b.date.localeCompare(a.date)},
 tasks:{n:'งานที่ต้องทำ',i:'⏰',f:[['title','งาน'],['subject','วิชา','text',0,1],['due_at','กำหนดส่ง','datetime-local']],sort:(a,b)=>(a.done-b.done)||new Date(a.due_at)-new Date(b.due_at)}
};
const cache={};let fin=null,news=[],newsNote='';
let scheduleImageUrl=null;
const SCHEDULE_IMAGE_PATH='schedule';
const SCHEDULE_IMAGE_DB='student-dashboard-images';

function openImageStore(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(SCHEDULE_IMAGE_DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('images');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}
async function localImage(action,value){
 const db=await openImageStore();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('images',action==='get'?'readonly':'readwrite'),store=tx.objectStore('images');
  const request=action==='get'?store.get('timetable'):action==='put'?store.put(value,'timetable'):store.delete('timetable');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
  tx.oncomplete=()=>db.close();
  tx.onerror=()=>{db.close();reject(tx.error)};
 });
}
async function loadScheduleImage(){
 try{
  if(sb){
   const{data,error}=await sb.storage.from('timetable').list('',{search:'schedule'});
   if(error)throw error;
   scheduleImageUrl=data.some(x=>x.name===SCHEDULE_IMAGE_PATH)
    ?sb.storage.from('timetable').getPublicUrl(SCHEDULE_IMAGE_PATH).data.publicUrl+'?v='+Date.now():null;
  }else{
   const blob=await localImage('get');
   scheduleImageUrl=blob?URL.createObjectURL(blob):null;
  }
 }catch(error){
  toast(`โหลดรูปตารางเรียนไม่สำเร็จ: ${error.message}`,'bad');
  throw error;
 }
}

/* ---------- ตัวช่วย ---------- */
const fmtDT=i=>i?new Date(i).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'-';
const toLocal=i=>{if(!i)return'';const d=new Date(i);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)};
const today=()=>toLocal(new Date()).slice(0,10);
const cell=(f,v)=>{const[,,ty,o]=f;if(v==null||v==='')return'-';
 if(ty==='select')return esc(o.find(x=>x[0]==v)?.[1]||v);if(ty==='datetime-local')return fmtDT(v);
 if(/^https?:\/\//.test(v))return`<a href="${esc(v)}" target="_blank" rel="noopener">เปิดลิงก์</a>`;return esc(v)};
function toast(m,k=''){const e=document.createElement('div');e.className='ts '+k;e.textContent=m;$('#toasts').append(e);setTimeout(()=>e.remove(),2800)}
async function load(t){try{cache[t]=await db.list(t)}catch(e){cache[t]=[];toast(`โหลด "${T[t].n}" ไม่สำเร็จ: ${e.message}`,'bad')}}

/* ---------- ป็อปอัพ ---------- */
function modal(title,body,onOk,okText='บันทึก'){
 const m=document.createElement('div');m.className='ov';
 m.innerHTML=`<div class="md" role="dialog"><div class="mh"><b>${esc(title)}</b><button type="button" class="x" aria-label="ปิด">✕</button></div><form><div class="mb">${body}</div><div class="mf"><button type="button" class="btn g x">${onOk?'ยกเลิก':'ปิด'}</button>${onOk?`<button class="btn ok-b">${okText}</button>`:''}</div></form></div>`;
 document.body.append(m);
 const close=()=>{m.classList.add('out');setTimeout(()=>m.remove(),180)};
 m.querySelectorAll('.x').forEach(b=>b.onclick=close);m.onclick=e=>{if(e.target===m)close()};
 m.querySelector('form').onsubmit=async e=>{e.preventDefault();if(!onOk)return;const b=m.querySelector('.ok-b');b.disabled=true;b.innerHTML='<i class="sp"></i>';
  try{await onOk(new FormData(e.target));close()}catch(err){toast(err.message||'เกิดข้อผิดพลาด','bad');b.disabled=false;b.textContent=okText}};
 m.querySelector('input,select,textarea')?.focus();return m}
const input=(f,v)=>{const[n,,ty,o,opt]=f,rq=opt?'':'required';
 if(ty==='select')return`<select name="${n}">${o.map(([a,b])=>`<option value="${a}" ${a==v?'selected':''}>${b}</option>`).join('')}</select>`;
 return`<input name="${n}" type="${ty}" ${ty==='number'?'step="any"':''} value="${esc(ty==='datetime-local'?toLocal(v):v)}" ${rq}>`};
function collect(t,fd){const r={};T[t].f.forEach(([n,,ty])=>{let v=fd.get(n);
 if(ty==='number'||n==='day_no')v=v===''||v==null?null:Number(v);else if(ty==='datetime-local')v=v?new Date(v).toISOString():null;else if(v==='')v=null;r[n]=v});return r}
function openForm(t,id){const c=T[t],row=id?cache[t].find(x=>x.id==id):{};
 modal((id?'แก้ไข':'เพิ่ม')+c.n,c.f.map(f=>`<label>${f[1]}${input(f,row[f[0]]??(f[0]==='date'?today():''))}</label>`).join(''),
 async fd=>{const r=collect(t,fd);if(t==='tasks'&&!id)r.done=false;
  if(t==='attendance'&&!id){const ex=cache.attendance.find(x=>x.date===r.date);if(ex)id=ex.id}
  await db.save(t,r,id);await load(t);render();toast('บันทึกแล้ว')})}

/* ---------- เช็คชื่อ ---------- */
const todayRow=()=>cache.attendance.find(x=>x.date===today());
async function markAtt(status,reason=null){const ex=todayRow();await db.save('attendance',{date:today(),status,reason},ex?.id);await load('attendance');render();toast('บันทึกการเช็คชื่อแล้ว')}
function absentForm(){modal('แจ้งไม่มาเรียน',`<label>ประเภท<select name="s">${STAT.slice(1).map(([a,b])=>`<option value="${a}">${b}</option>`).join('')}</select></label><label>เหตุผล<input name="r" required placeholder="ระบุเหตุผล"></label>`,fd=>markAtt(fd.get('s'),fd.get('r')))}

/* ---------- ข้อมูลภายนอก ---------- */
const csv=t=>t.trim().split(/\r?\n/).map(l=>{const o=[];let c='',q=0;for(const ch of l){if(ch=='"')q=!q;else if(ch==','&&!q){o.push(c);c=''}else c+=ch}o.push(c);return o});
async function loadFin(){if(!C.SHEET_CSV_URL)return;const r=await fetch(C.SHEET_CSV_URL);if(!r.ok)throw Error('Sheet '+r.status);fin=csv(await r.text())}
async function loadNews(){
 if(C.NEWS_API_URL){const r=await fetch(C.NEWS_API_URL);const j=await r.json();news=Array.isArray(j)?j:j.items||[];return}
 newsNote='ยังไม่ได้ตั้งค่า NEWS_API_URL ในไฟล์ js/config.js (ตัวอย่างข้อมูลด้านล่าง)';
 news=[{title:'ตัวอย่าง: ประกาศกำหนดการสอบกลางภาค',date:new Date().toISOString(),summary:'ข่าวจริงจะแสดงเมื่อเชื่อมต่อ API'}]}

/* ---------- หน้าแสดงผล ---------- */
const cdText=due=>{let s=Math.floor((new Date(due)-Date.now())/1000);const late=s<0;s=Math.abs(s);
 const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return(late?'เลยกำหนด ':'')+(d?d+' วัน ':'')+`${h} ชม. ${m} น. ${s%60} วิ`};
function tick(){document.querySelectorAll('[data-due]').forEach(e=>{const ms=new Date(e.dataset.due)-Date.now();
 e.querySelector('.t').textContent=cdText(e.dataset.due);e.classList.toggle('bad',ms<0||ms<864e5/2);e.classList.toggle('warn',ms>=864e5/2&&ms<864e5*2)})}
function listView(t,extra=''){const c=T[t],rows=[...cache[t]];if(c.sort)rows.sort(c.sort);const tk=t==='tasks';
 return`<div class="row"><h2>${c.i} ${c.n}</h2><button class="btn" data-a="add" data-t="${t}">+ เพิ่ม</button></div>${extra}
 <div class="card tw">${rows.length?`<table><tr>${tk?'<th></th>':''}${c.f.map(f=>`<th>${f[1]}</th>`).join('')}<th></th></tr>${rows.map(r=>`<tr class="${tk&&r.done?'dn':''}">
 ${tk?`<td><input type="checkbox" style="width:auto" data-a="tog" data-id="${r.id}" ${r.done?'checked':''}></td>`:''}${c.f.map(f=>`<td>${cell(f,r[f[0]])}</td>`).join('')}
 <td><button class="btn g s" data-a="edit" data-t="${t}" data-id="${r.id}">แก้ไข</button> <button class="btn g s" data-a="del" data-t="${t}" data-id="${r.id}">ลบ</button></td></tr>`).join('')}</table>`:'<div class="empty">ยังไม่มีข้อมูล กด "+ เพิ่ม" เพื่อเริ่มต้น</div>'}</div>`}
function timetableView(){return`<div class="row"><h2>🗓️ ตารางเรียน</h2>${scheduleImageUrl?'':`
 <label class="btn schedule-upload">เลือกรูปตารางเรียน<input type="file" accept="image/jpeg,image/png,image/webp" data-a="schedule-upload"></label>`}
 </div><section class="card schedule-card">${scheduleImageUrl
  ?`<img class="schedule-image" src="${esc(scheduleImageUrl)}" alt="รูปตารางเรียน"><div class="bt"><label class="btn g schedule-upload">เปลี่ยนรูป<input type="file" accept="image/jpeg,image/png,image/webp" data-a="schedule-upload"></label><button class="btn d" data-a="schedule-delete">ลบรูป</button></div>`
  :'<div class="empty">ยังไม่มีรูปตารางเรียน เลือกรูปเพื่อเพิ่มได้เลย</div>'}</section>`}
const fbFrame=()=>`<iframe id="fb" src="https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(C.FB_PAGE_URL)}&tabs=timeline&width=500&height=600&small_header=true&adapt_container_width=true&t=${Date.now()}" width="100%" height="600" style="border:0;background:#fff;border-radius:8px" loading="lazy" allow="encrypted-media"></iframe>`;
const views={
 home(){const pend=cache.tasks.filter(x=>!x.done).sort((a,b)=>new Date(a.due_at)-new Date(b.due_at)),a=todayRow();
  return`<div class="grid"><section class="card"><h2>⏳ นับถอยหลังงาน (ใกล้ครบกำหนดอยู่บนสุด)</h2>${pend.length?pend.map(x=>`<div class="cd" data-due="${x.due_at}"><div><b>${esc(x.title)}</b><br><small>${esc(x.subject||'')} · ${fmtDT(x.due_at)}</small></div><b class="t"></b></div>`).join(''):'<div class="empty">ไม่มีงานค้าง 🎉</div>'}</section>
  <section class="card"><h2>✅ เช็คชื่อวันนี้ (${new Date().toLocaleDateString('th-TH',{dateStyle:'long'})})</h2>
  <p style="margin-bottom:12px;color:var(--mu)">สถานะ: <b style="color:var(--tx)">${a?esc(STAT.find(s=>s[0]===a.status)[1])+(a.reason?' – '+esc(a.reason):''):'ยังไม่ได้เช็คชื่อ'}</b></p>
  <div class="bt"><button class="btn ok" data-a="pres">มาเรียนตามปกติ</button><button class="btn d" data-a="abs">ไม่มาเรียน</button></div></section></div>
  <section class="card news"><h2>📢 ข่าวประชาสัมพันธ์ล่าสุด</h2>${C.FB_PAGE_URL?fbFrame():`${newsNote?`<small>${newsNote}</small>`:''}${news.map(n=>`<a ${n.url?`href="${esc(n.url)}" target="_blank" rel="noopener"`:''}><b>${esc(n.title)}</b><small>${n.date?fmtDT(n.date):''} ${esc(n.summary||'')}</small></a>`).join('')||'<div class="empty">ไม่มีข่าว</div>'}`}</section>`},
 scores(){const g={};cache.scores.forEach(r=>{(g[r.subject]??={s:0,m:0}).s+=+r.score;g[r.subject].m+=+r.max_score});
  return listView('scores',`<div class="card">${Object.entries(g).map(([k,v])=>`<span class="tag" style="margin-right:6px">${esc(k)}: ${v.s}/${v.m} (${(v.s/v.m*100).toFixed(1)}%)</span>`).join('')||'<span class="empty">สรุปคะแนนรายวิชาจะแสดงที่นี่</span>'}</div>`)},
 finance(){return`<div class="row"><h2>💰 การเงินประจำสัปดาห์</h2><div class="bt"><button class="btn g" data-a="rf">รีเฟรช</button>${C.SHEET_EDIT_URL?`<a class="btn" href="${esc(C.SHEET_EDIT_URL)}" target="_blank" rel="noopener">เปิด Google Sheet</a>`:''}</div></div>
  <div class="card tw">${fin?`<table><tr>${fin[0].map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${fin.slice(1).map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`:'<div class="empty">ยังไม่ได้เชื่อม Google Sheet<br>ใส่ SHEET_CSV_URL ใน js/config.js (ดูวิธีใน README)</div>'}</div>`}
};
views.timetable=timetableView;
['files','contacts','attendance','tasks'].forEach(t=>views[t]=()=>listView(t));
const NAV=[['home','หน้าแรก','🏠'],['timetable','ตารางเรียน','🗓️'],['scores','คะแนน','📝'],['files','ไฟล์เรียน','📁'],['contacts','ติดต่อ','📞'],['attendance','เช็คชื่อ','✅'],['tasks','งาน','⏰'],['finance','การเงิน','💰']];
function render(){const v=views[location.hash.slice(1)]?location.hash.slice(1):'home';
 $('#nav').innerHTML=NAV.map(([k,l,i])=>`<a href="#${k}" class="${k===v?'on':''}"><span>${i}</span>${l}</a>`).join('');
 $('#main').innerHTML=views[v]();tick()}

/* ---------- การกระทำของปุ่ม ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;const{a,t,id}=b.dataset;
 if(a==='add')openForm(t);else if(a==='edit')openForm(t,id);
 else if(a==='del')modal('ยืนยันการลบ','<p>ต้องการลบรายการนี้ใช่หรือไม่? การลบย้อนกลับไม่ได้</p>',async()=>{await db.del(t,id);await load(t);render();toast('ลบแล้ว')},'ลบ');
 else if(a==='schedule-delete')modal('ยืนยันการลบรูป','<p>ต้องการลบรูปตารางเรียนใช่หรือไม่?</p>',async()=>{
  if(sb){const{error}=await sb.storage.from('timetable').remove([SCHEDULE_IMAGE_PATH]);if(error)throw error}
  else await localImage('delete');
  if(scheduleImageUrl?.startsWith('blob:'))URL.revokeObjectURL(scheduleImageUrl);
  scheduleImageUrl=null;render();toast('ลบรูปแล้ว')
 },'ลบรูป');
 else if(a==='tog'){await db.save('tasks',{done:b.checked},id);await load('tasks');render()}
 else if(a==='pres')markAtt('present');else if(a==='abs')absentForm();
 else if(a==='rf'){b.disabled=true;try{await loadFin();toast('อัปเดตแล้ว')}catch(x){toast('ดึงข้อมูลชีตไม่ได้: '+x.message,'bad')}render()}});
document.addEventListener('change',async e=>{
 const input=e.target.closest('[data-a="schedule-upload"]'),file=input?.files[0];
 if(!file)return;
 try{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('รองรับเฉพาะรูป JPG, PNG หรือ WebP');
  if(file.size>10*1024*1024)throw Error('ขนาดรูปต้องไม่เกิน 10 MB');
  if(sb){
   const{error}=await sb.storage.from('timetable').upload(SCHEDULE_IMAGE_PATH,file,{upsert:true,contentType:file.type,cacheControl:'3600'});
   if(error)throw error;
   if(scheduleImageUrl?.startsWith('blob:'))URL.revokeObjectURL(scheduleImageUrl);
   scheduleImageUrl=sb.storage.from('timetable').getPublicUrl(SCHEDULE_IMAGE_PATH).data.publicUrl+'?v='+Date.now();
  }else{
   await localImage('put',file);
   if(scheduleImageUrl?.startsWith('blob:'))URL.revokeObjectURL(scheduleImageUrl);
   scheduleImageUrl=URL.createObjectURL(file);
  }
  render();toast('อัปโหลดรูปตารางเรียนแล้ว');
 }catch(error){toast(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`,'bad')}
 finally{input.value=''}
});
addEventListener('hashchange',render);setInterval(tick,1000);

/* ---------- เริ่มระบบ ---------- */
(async()=>{
 $('#o-name').textContent=C.OWNER.name;$('#o-id').textContent='รหัสนักเรียน '+C.OWNER.id;$('#o-school').textContent='โรงเรียน'+C.OWNER.school;
 const m=$('#mode');m.textContent=sb?'● Supabase':'โหมดทดลอง (เก็บในเครื่อง)';m.classList.toggle('on',!!sb);
 const steps=[...Object.keys(T).filter(t=>t!=='timetable').map(t=>[T[t].n,()=>load(t)]),['รูปตารางเรียน',loadScheduleImage],['การเงิน (Google Sheet)',loadFin],['ข่าวประชาสัมพันธ์',loadNews]];let n=0;
 await Promise.all(steps.map(async([l,fn])=>{let ok='✓';try{await fn()}catch(e){ok='✗'}n++;$('#bar').style.width=n/steps.length*100+'%';$('#ls').insertAdjacentHTML('beforeend',`<li>${ok} ${l}</li>`)}));
 render();setTimeout(()=>$('#load').classList.add('out'),350);
})();

// โหลด Facebook plugin ใหม่ทุก 60 วินาที (ไม่โหลดตอนมีป็อปอัพเปิดอยู่)
setInterval(()=>{const f=$('#fb');if(f&&!document.querySelector('.ov'))f.src=f.src.replace(/&t=\d+/,'&t='+Date.now())},6000);
