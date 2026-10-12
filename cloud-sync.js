'use strict';
// 云同步只请求GitHub官方API。记录仓库必须私有，授权不进公开源码。
const cloudOwner='chenyifan030206-png',cloudRepo='asw-learning-records';
const cloudKey='asw-cloud:'+pagesBase.pathname;
let cloudFlight=null,cloudTimer=null;
function cloudCanonical(value){if(Array.isArray(value))return '['+value.map(cloudCanonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+cloudCanonical(value[k])).join(',')+'}';return JSON.stringify(value);}
function cloudTime(row){return Date.parse(row.updated||row.created||'')||0;}
function cloudClean(input){
  const data=input?.data||input;
  if(!data||['notes','progress','runs','attempts'].some(t=>!Array.isArray(data[t])||data[t].length>50000))throw Error('学习备份格式不正确。');
  const result={notes:[],progress:[],runs:[],attempts:[]};
  for(const t of Object.keys(result))for(const row of data[t]){
    if(!row||!Number.isInteger(row.day)||row.day<1||row.day>84)throw Error('记录里的学习日无效。');
    if(t==='notes'&&(typeof row.notes!=='string'||typeof row.feedback!=='string'||row.notes.length+row.feedback.length>100000))throw Error('笔记格式或长度不正确。');
    if(t==='notes'&&row.code_notes!==undefined&&(typeof row.code_notes!=='string'||row.code_notes.length>200000))throw Error('源码注释格式或长度不正确。');
    if(t==='notes'&&row.history!==undefined&&(!Array.isArray(row.history)||row.history.some(v=>v.code_notes!==undefined&&(typeof v.code_notes!=='string'||v.code_notes.length>200000))))throw Error('源码注释历史格式不正确。');
    if(t==='progress'&&!['test','manual'].includes(row.method))throw Error('通关方式无效。');
    if(t==='runs'&&(typeof row.inputs!=='string'||typeof row.output!=='string'))throw Error('运行记录格式无效。');
    if(t==='attempts'&&(typeof row.answers!=='string'||typeof row.result!=='string'))throw Error('检测记录格式无效。');
    if(t==='runs'){JSON.parse(row.inputs);JSON.parse(row.output);}if(t==='attempts'){JSON.parse(row.answers);JSON.parse(row.result);}
    result[t].push(structuredClone(row));
  }
  return result;
}
function cloudVersions(note){
  const items=[...(note.history||[]),note];
  return items.filter(n=>typeof n.notes==='string'&&typeof n.feedback==='string').map(n=>({day:note.day,notes:n.notes,feedback:n.feedback,...(n.code_notes!==undefined?{code_notes:n.code_notes}:{}),updated:n.updated||'',source:n.source||'browser'}));
}
function cloudMerge(a,b){
  a=cloudClean(a);b=cloudClean(b);const out={notes:[],progress:[],runs:[],attempts:[]};
  for(const day of [...new Set([...a.notes,...b.notes].map(n=>n.day))].sort((x,y)=>x-y)){
    const versions=new Map();for(const note of [...a.notes,...b.notes].filter(n=>n.day===day))for(const v of cloudVersions(note))versions.set(cloudCanonical(v),v);
    const history=[...versions.values()].sort((x,y)=>cloudTime(x)-cloudTime(y)||cloudCanonical(x).localeCompare(cloudCanonical(y)));
    const current=history.pop();
    // 较旧客户端未发送code_notes时，也不能抹掉另一设备保存的个人源码。
    if(current.code_notes===undefined){const annotated=history.findLast(v=>v.code_notes!==undefined);if(annotated)current.code_notes=annotated.code_notes;}
    out.notes.push({...current,history});
  }
  for(const day of [...new Set([...a.progress,...b.progress].map(n=>n.day))].sort((x,y)=>x-y)){
    const rank=p=>p.method==='test'?(p.source==='local-c'?3:2):1;
    const list=[...a.progress,...b.progress].filter(p=>p.day===day).sort((x,y)=>rank(x)-rank(y)||cloudTime(x)-cloudTime(y)||cloudCanonical(x).localeCompare(cloudCanonical(y)));
    out.progress.push(list.at(-1));
  }
  for(const t of ['runs','attempts']){
    const rows=new Map();for(const row of [...a[t],...b[t]]){
      const key=row.sync_id||cloudCanonical([row.day,row.created,row.inputs,row.output,row.answers,row.result]);
      rows.set(key,row);
    }
    out[t]=[...rows.values()].sort((x,y)=>cloudTime(x)-cloudTime(y)||cloudCanonical(x).localeCompare(cloudCanonical(y)));
  }
  return out;
}
function cloudConfig(){try{return JSON.parse(localStorage.getItem(cloudKey)||'{}');}catch{return {};}}
function cloudToken(){return sessionStorage.getItem(cloudKey+':token')||localStorage.getItem(cloudKey+':token')||'';}
function cloudStatus(text){document.getElementById('cloudStatus').textContent=text;}
async function cloudRequest(path,method='GET',body){
  const token=cloudToken();if(!token)throw Error('尚未连接云端。先填写只授权私有记录仓库的专用令牌。');
  const response=await fetch('https://api.github.com'+path,{method,headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  if(!response.ok){const error=new Error(response.status===401?'授权无效或已过期，请重新连接。':response.status===403?'GitHub拒绝请求：检查令牌Contents读写权限或API频率。':response.status===404?'无法读取私有记录仓库，请检查专用令牌是否只选中了asw-learning-records。':response.status===409||response.status===422?'云端记录刚发生变化，正在重新合并。':`云同步失败（HTTP ${response.status}）。`);error.status=response.status;throw error;}
  return response.status===204?{}:response.json();
}
function cloudBase64(text){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
function cloudDecode(text){const bytes=Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0));return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
async function cloudRefresh(jump=false){
  if(window.pagesAppReady)await window.pagesAppReady;
  if(typeof state==='undefined'||!state)return;
  state=await api('/api/state');drawRoute();completeUI();
  if(jump){const ready=state.courses.filter(c=>c.unlocked&&c.published),next=ready.find(c=>!c.completed)||ready.at(-1);if(next)await selectDay(next.day);}
  else if(!dirty&&!['notes','feedback','codeNotes'].includes(document.activeElement?.id)){
    const n=pagesLoad().notes.find(n=>n.day===day);if(n){$('notes').value=n.notes;$('feedback').value=n.feedback;$('codeNotes').value=n.code_notes||lesson.code;resizeCodeNotes();if(codeView==='personal')coloredCode($('code'),$('codeNotes').value);}
  }
  cloudHistory();
}
function cloudHistory(){
  const target=document.getElementById('cloudHistory');if(!target)return;target.replaceChildren();
  for(const note of pagesLoad().notes){const versions=cloudVersions(note);if(versions.length<2)continue;
    const section=document.createElement('details'),heading=document.createElement('summary');heading.textContent=`D${String(note.day).padStart(2,'0')} · ${versions.length}个笔记版本（全部保留）`;section.append(heading);
    for(const v of versions){const p=document.createElement('p');p.textContent=`${v.updated} · ${v.source==='local-c'?'原本地记录':'浏览器记录'}`;const pre=document.createElement('pre');pre.textContent=`笔记：\n${v.notes}\n\n反馈：\n${v.feedback}\n\n源码注释：\n${v.code_notes||'该版本没有源码注释'}`;section.append(p,pre);}target.append(section);
  }
  if(!target.children.length)target.textContent='出现不同设备的笔记版本时，会在这里保留完整历史。';
}
async function cloudSync(jump=false){
  if(cloudFlight)return cloudFlight;
  if(typeof busy!=='undefined'&&busy){cloudStatus('正在运行或检测，完成后再同步。');return;}
  cloudFlight=(async()=>{
    if(typeof saveNotes==='function')await saveNotes();cloudStatus('正在读取云记录并合并…');
    const repo=await cloudRequest(`/repos/${cloudOwner}/${cloudRepo}`);
    if(!repo.private||repo.owner?.login!==cloudOwner)throw Error('目标不是指定私有仓库，停止同步。');
    for(let retry=0;retry<3;retry++){
      let file=null;try{file=await cloudRequest(`/repos/${cloudOwner}/${cloudRepo}/contents/records.json`);}catch(e){if(e.status!==404)throw e;}
      // Contents超过1MB可能不内嵌content，改取同一个sha的blob，仍只读私有仓库。
      const blob=file&&!file.content?await cloudRequest(`/repos/${cloudOwner}/${cloudRepo}/git/blobs/${file.sha}`):file;
      const remote=blob?cloudClean(JSON.parse(cloudDecode(blob.content))):{notes:[],progress:[],runs:[],attempts:[]};
      // GET期间发生的本地编辑也纳入，不能用请求开始时的旧快照覆盖它。
      const merged=cloudMerge(remote,pagesLoad());
      localStorage.setItem(pagesStorageKey,JSON.stringify(merged));
      if(cloudCanonical(merged)!==cloudCanonical(remote)){
        const packageData={schema:2,kind:'asw-learning-cloud',data:merged};
        try{await cloudRequest(`/repos/${cloudOwner}/${cloudRepo}/contents/records.json`,'PUT',{message:'Sync learning records',content:cloudBase64(JSON.stringify(packageData)),...(file?{sha:file.sha}:{})});}
        catch(e){if([409,422].includes(e.status)&&retry<2)continue;throw e;}
      }
      await cloudRefresh(jump);cloudStatus('云同步成功 · '+new Date().toLocaleTimeString('zh-CN')+' · 新旧记录已合并');return;
    }
  })().catch(e=>{cloudStatus(e.message+' 当前浏览器记录仍保留，可重试。');throw e;}).finally(()=>{cloudFlight=null;});
  return cloudFlight;
}
window.addEventListener('asw-records-changed',()=>cloudStatus(cloudToken()?'已保存到当前浏览器，等待手动或定时同步。':'已保存到当前浏览器；连接后可同步云端。'));
function cloudSchedule(){
  clearInterval(cloudTimer);const interval=Number(document.getElementById('cloudInterval').value);
  const settings=cloudConfig();settings.interval=interval;localStorage.setItem(cloudKey,JSON.stringify(settings));
  if(interval>0)cloudTimer=setInterval(()=>{if(cloudToken()&&!document.hidden)cloudSync(false).catch(()=>{});},interval*1000);
}
document.getElementById('cloudConnect').onclick=async()=>{
  const token=document.getElementById('cloudToken').value.trim();if(!token){cloudStatus('请先填写专用令牌；不要把令牌发到聊天。');return;}
  localStorage.removeItem(cloudKey+':token');sessionStorage.setItem(cloudKey+':token',token);
  try{
    await cloudSync(true);
    if(document.getElementById('cloudRemember').checked)localStorage.setItem(cloudKey+':token',token);
    document.getElementById('cloudToken').value='';cloudSchedule();
  }catch{sessionStorage.removeItem(cloudKey+':token');}
};
document.getElementById('cloudSave').onclick=()=>cloudSync(false).catch(()=>{});
document.getElementById('cloudInterval').onchange=cloudSchedule;
document.getElementById('cloudDisconnect').onclick=()=>{localStorage.removeItem(cloudKey+':token');sessionStorage.removeItem(cloudKey+':token');document.getElementById('cloudToken').value='';cloudStatus('已断开云授权；浏览器和云端记录均保留。');};
document.getElementById('cloudImport').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>10*1024*1024)throw Error('备份文件超过10MB。');if(busy)throw Error('请等待运行或检测完成。');await saveNotes();
    const incoming=cloudClean(JSON.parse(await file.text())),merged=cloudMerge(pagesLoad(),incoming);
    localStorage.setItem(pagesStorageKey,JSON.stringify(merged));await cloudRefresh(true);cloudStatus('恢复成功：进度与笔记已合并，没有删除浏览器的新记录。');
    if(cloudToken())await cloudSync(false);
  }catch(e){cloudStatus('恢复未完成：'+e.message);}finally{event.target.value='';}
};
const savedCloudConfig=cloudConfig();document.getElementById('cloudInterval').value=String(savedCloudConfig.interval??60);cloudSchedule();cloudHistory();
if(cloudToken())pagesReady.then(()=>cloudSync(true)).catch(()=>{});
window.addEventListener('focus',()=>{if(cloudToken())cloudSync(false).catch(()=>{});});
