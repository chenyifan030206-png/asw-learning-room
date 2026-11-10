'use strict';
/* 独立零基础导学页：纯静态Pages，无浏览器内Python解释器；本地浏览器自动保存。 */
const $ = id => document.getElementById(id);
const STORE_KEY = 'asw-python-foundation-v1:' + location.pathname;
const stateDefault = () => ({schema:1,done:[],answers:{},notes:{},annotations:[],fileNotes:{},checklist:{},lastChapter:'start'});
let book = null, state = stateDefault(), activeChapter = 'start', activePanel = 'chapter';
let activeFile = 'main.py', currentFileText = '', lastSelection = '';
let hasOpenedChapter = false;
const fileCache = new Map();

function loadState(){
  try{
    const value=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
    if(value && value.schema===1 && Array.isArray(value.done) && value.notes &&
       typeof value.notes==='object' && !Array.isArray(value.notes) &&
       Array.isArray(value.annotations) && value.fileNotes &&
       typeof value.fileNotes==='object' && !Array.isArray(value.fileNotes)){
      return Object.assign(stateDefault(),value);
    }
  }catch(error){ console.warn('笔记加载异常，可使用导入文件恢复',error); }
  return stateDefault();
}
function saveState(){
  try{
    localStorage.setItem(STORE_KEY,JSON.stringify(state));
    $('saveStatus').textContent='已自动保存 · '+new Date().toLocaleTimeString('zh-CN');
    $('fileSaveStatus').textContent='源码个人理解已自动保存 · '+new Date().toLocaleTimeString('zh-CN');
  }catch(error){
    $('saveStatus').textContent='浏览器本地保存失败，请立即导出JSON备份。';
    console.error(error);
  }
  updateProgress();
}
function node(tag,text,cls){
  const el=document.createElement(tag);
  if(text!==undefined && text!==null)el.textContent=String(text);
  if(cls)el.className=cls;
  return el;
}
function quoteMarks(text){
  const frag=document.createDocumentFragment();
  const quotes=(state.annotations||[])
    .filter(x=>x.chapter===activeChapter && typeof x.quote==='string' && x.quote.length>0)
    .map(x=>x.quote).sort((a,b)=>b.length-a.length);
  let rest=String(text);
  while(rest.length){
    let match=null,pos=-1;
    for(const q of quotes){
      const found=rest.indexOf(q);
      if(found>=0 && (pos<0||found<pos)){pos=found;match=q;}
    }
    if(pos<0){frag.append(node('span',rest));break;}
    if(pos)frag.append(node('span',rest.slice(0,pos)));
    frag.append(node('mark',match,'noteMark'));
    rest=rest.slice(pos+match.length);
  }
  return frag;
}
function paragraph(target,text,cls){
  const p=node('p',undefined,cls);
  p.append(quoteMarks(text));
  target.append(p);
  return p;
}
function heading(parent,title){
  const h=node('h3',title);
  parent.append(h);return h;
}
function safeDownload(name,data,mime){
  const blob=new Blob([data],{type:mime||'text/plain;charset=utf-8'});
  const href=URL.createObjectURL(blob),a=node('a');
  a.href=href;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),3000);
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);return true;}
  catch(error){alert('复制失败，可选择文本手动复制，或使用导出按钮。');return false;}
}
function updateProgress(){
  if(!book)return;
  const done=new Set(state.done);
  const finished=book.chapters.filter(x=>done.has(x.id)).length;
  $('progressLine').textContent='本页标记掌握 '+finished+' / '+book.chapters.length+
    ' 章 · 标记仅表示自己已阅读/练习，不等同于本地Python运行。';
  $('chapterCount').textContent='已标记 '+finished+' / '+book.chapters.length+' 章';
  for(const b of $('chapterNav').querySelectorAll('[data-chapter]')){
    b.classList.toggle('done',done.has(b.dataset.chapter));
  }
}
function showPanel(type){
  activePanel=type;
  $('chapterPanel').hidden=type!=='chapter';
  $('projectPanel').hidden=type!=='project';
  $('atlasPanel').hidden=type!=='atlas';
  $('bridgePanel').hidden=type!=='bridge';
  $('resourcesPanel').hidden=type!=='resources';
  $('finalPanel').hidden=type!=='final';
  for(const b of $('chapterNav').querySelectorAll('[data-chapter]')){
    b.classList.toggle('selected',type==='chapter' && b.dataset.chapter===activeChapter);
  }
  if(type==='bridge') renderBridge();
  if(type==='atlas') renderAtlas();
  if(type==='resources') renderResources();
  if(type==='project') renderProject();
  if(type==='final') renderFinal();
}
function renderChapterNav(filter=''){
  $('chapterNav').replaceChildren();
  const term=filter.trim().toLowerCase();
  for(const chapter of book.chapters){
    if(term && !(chapter.title+' '+chapter.phase+' '+chapter.goal+' '+(chapter.deepDive||[]).map(x=>x.title+' '+x.syntax).join(' ')).toLowerCase().includes(term))continue;
    const b=node('button',chapter.title);
    b.type='button';b.dataset.chapter=chapter.id;
    b.onclick=()=>openChapter(chapter.id);
    $('chapterNav').append(b);
  }
  updateProgress();
  for(const b of $('chapterNav').querySelectorAll('[data-chapter]')){
    b.classList.toggle('selected',activePanel==='chapter' && b.dataset.chapter===activeChapter);
  }
}
function openChapter(id){
  const chapter=book.chapters.find(x=>x.id===id);
  if(!chapter)return;
  // 先保存离开前的笔记，不因切换章节而丢失。
  if(hasOpenedChapter && activePanel==='chapter' && book.chapters.some(x=>x.id===activeChapter)){
    state.notes[activeChapter]=$('chapterNote').value;
    saveState();
  }
  activeChapter=id;state.lastChapter=id;saveState();showPanel('chapter');
  const target=$('chapterPanel');target.replaceChildren();
  const card=node('div',undefined,'chapter');
  card.append(node('div',chapter.phase+' · 建议'+chapter.minutes+'分钟','phaseTag'));
  card.append(node('h2',chapter.title));
  paragraph(card,'本节要能做到：'+chapter.goal,'goal');
  heading(card,'先把问题和场景讲清楚');
  for(const p of chapter.story)paragraph(card,p,'explain');
  // V2以依赖知识和逐条语法为主；原章节示例保留作最后的整章复盘。
  if(Array.isArray(chapter.deepDive) && chapter.deepDive.length){
    const preface=node('div',undefined,'chapterPrerequisites');
    const ptitle=node('strong','开始前先确认');
    preface.append(ptitle);
    for(const p of chapter.prerequisites||[])paragraph(preface,p);
    card.append(preface);
    heading(card,'本章每一项语法怎么读（'+chapter.deepDive.length+'节）');
    const miniNav=node('nav',undefined,'miniIndex');
    miniNav.setAttribute('aria-label','本章语法小节');
    chapter.deepDive.forEach((part,i)=>{
      const a=node('a',String(i+1).padStart(2,'0')+' · '+part.title);
      a.href='#grammar-'+chapter.id+'-'+i;
      miniNav.append(a);
    });
    card.append(miniNav);
    for(const [i,part] of chapter.deepDive.entries()){
      const section=node('section',undefined,'grammarUnit');
      section.id='grammar-'+chapter.id+'-'+i;
      section.append(node('div','语法小节 '+(i+1)+' / '+chapter.deepDive.length,'grammarCounter'));
      section.append(node('h3',part.title));
      const syntax=node('div',undefined,'grammarSyntax');
      syntax.append(node('strong','这一句的语法形式'));
      syntax.append(node('pre',part.syntax));
      section.append(syntax);
      heading(section,'每个部分是什么意思、为什么这样写');
      paragraph(section,part.explain,'grammarExplain');
      const body=node('div',undefined,'grammarColumns');
      const left=node('div',undefined,'grammarCodePanel');
      const top=node('div',undefined,'codeTop');
      top.append(node('span','可独立阅读的小程序 · 先预测输出'));
      const copyBtn=node('button','复制代码');
      copyBtn.type='button';
      copyBtn.onclick=()=>copyText(part.code).then(ok=>{if(ok)copyBtn.textContent='已复制';});
      top.append(copyBtn);
      left.append(top);
      const pre=node('pre',part.code,'grammarCode');
      pre.tabIndex=0;
      left.append(pre);
      const right=node('div',undefined,'grammarTracePanel');
      heading(right,'实际执行时发生了什么');
      const ol=node('ol',undefined,'trace');
      for(const step of part.trace)ol.append(node('li',step));
      right.append(ol);
      body.append(left,right);
      section.append(body);
      heading(section,'预期输出 / 观察到的结果');
      section.append(node('pre',part.output,'expected'));
      section.append(node('p','常见误解或错误：'+part.mistake,'tip'));
      section.append(node('p','请自己动手：'+part.exercise,'task'));
      card.append(section);
    }
    const conclusion=node('div',undefined,'chapterConclusion');
    heading(conclusion,'学完本章你应该能回答');
    paragraph(conclusion,chapter.chapterSummary||chapter.goal);
    card.append(conclusion);
  }
  heading(card,'整章复盘示例 · 把已讲语法合起来');
  const toolbar=node('div',undefined,'codeTop');
  toolbar.append(node('span','逐行中文注释 · 复制后到本地Python执行'));
  const copy=node('button','复制本节代码');
  copy.onclick=()=>copyText(chapter.code).then(ok=>{if(ok)copy.textContent='已复制';});
  toolbar.append(copy);
  const pre=node('pre',chapter.code);
  pre.tabIndex=0;
  card.append(toolbar,pre);
  heading(card,'按真正执行顺序逐步追踪');
  const steps=node('ol',undefined,'trace');
  for(const s of chapter.trace)steps.append(node('li',s));
  card.append(steps);
  heading(card,'应该看到什么');
  card.append(node('pre',chapter.expected,'expected'));
  heading(card,'和你已学的 C 语言有什么联系');
  paragraph(card,chapter.compare);
  card.append(node('p','容易出错：'+chapter.trap,'tip'));
  heading(card,'自己改一遍');
  card.append(node('p',chapter.task,'task'));
  heading(card,'本节理解检测（自测，不执行Python）');
  const box=node('div',undefined,'question');
  paragraph(box,chapter.check.q);
  for(const [i,opt] of chapter.check.options.entries()){
    const label=node('label'),radio=document.createElement('input');
    radio.type='radio';radio.name='check-'+id;radio.value=String(i);
    if(state.answers[id]===i)radio.checked=true;
    radio.onchange=()=>{state.answers[id]=i;saveState();renderQuestionHint();};
    label.append(radio,node('span',opt));box.append(label);
  }
  const result=node('p',undefined,'questionResult');
  box.append(result);
  function renderQuestionHint(){
    const selected=state.answers[id];
    result.textContent=selected===undefined?
      '请先选一个答案，再查看解释。':
      (selected===chapter.check.answer?'✓ 理解正确。':'✗ 与本节解释不一致。')+chapter.check.why;
  }
  renderQuestionHint();card.append(box);
  const controls=node('div',undefined,'chapterControls');
  const prior=book.chapters.findIndex(x=>x.id===id);
  const prev=node('button','上一章');
  prev.disabled=prior===0;prev.onclick=()=>openChapter(book.chapters[prior-1].id);
  const mark=node('button',state.done.includes(id)?'✓ 已标记掌握 · 点击取消':'标记本章已完成','primary');
  mark.onclick=()=>{
    const s=new Set(state.done);
    if(s.has(id))s.delete(id);else s.add(id);
    state.done=Array.from(s);saveState();mark.textContent=s.has(id)?'✓ 已标记掌握 · 点击取消':'标记本章已完成';
  };
  const next=node('button',prior===book.chapters.length-1?'查看能力清单':'下一章');
  next.onclick=()=>prior===book.chapters.length-1?showPanel('final'):openChapter(book.chapters[prior+1].id);
  controls.append(prev,mark,next);card.append(controls);
  target.append(card);
  $('chapterNote').value=state.notes[id]||'';
  renderAnnotations();
  $('selectionHint').textContent='在当前章节说明或代码中选择文字，再点击“为当前选中的文字做批注”。';
  window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-16),behavior:'auto'});
  renderChapterNav($('chapterSearch').value);
  hasOpenedChapter = true;
}
function renderAnnotations(){
  const list=$('annotationList');list.replaceChildren();
  const notes=(state.annotations||[]).filter(x=>x.chapter===activeChapter);
  if(!notes.length){list.append(node('p','当前章节暂无划线批注。','smalltext'));return;}
  for(const a of notes){
    const wrap=node('div',undefined,'annotation');
    wrap.append(node('q',a.quote));
    const input=node('textarea');input.rows=3;input.value=a.note||'';
    input.setAttribute('aria-label','编辑批注');
    input.addEventListener('input',()=>{a.note=input.value;saveState();});
    const remove=node('button','删除此条批注');
    remove.onclick=()=>{
      state.annotations=state.annotations.filter(x=>x.id!==a.id);
      saveState();openChapter(activeChapter);
    };
    wrap.append(input,remove);list.append(wrap);
  }
}
document.addEventListener('selectionchange',()=>{
  const sel=window.getSelection();
  if(!sel||sel.isCollapsed||!sel.anchorNode)return;
  const parent=sel.anchorNode.nodeType===1?sel.anchorNode:sel.anchorNode.parentElement;
  if(parent&&parent.closest('#chapterPanel')){
    const value=sel.toString().trim();
    if(value.length>0 && value.length<=240)lastSelection=value;
  }
});
$('annotateSelection').onclick=()=>{
  const quote=lastSelection;
  if(!quote){$('selectionHint').textContent='先在章节正文或代码中选中一段文字。';return;}
  const annotation=prompt('为这段文字写理解或疑问（可以先留空后编辑）：\n'+quote,'');
  if(annotation===null)return;
  state.annotations.push({id:Date.now()+'-'+Math.random().toString(36).slice(2),
    chapter:activeChapter,quote,note:annotation,created:new Date().toISOString()});
  lastSelection='';saveState();openChapter(activeChapter);
};
$('chapterNote').addEventListener('input',()=>{
  state.notes[activeChapter]=$('chapterNote').value;saveState();
});
$('chapterSearch').addEventListener('input',()=>renderChapterNav($('chapterSearch').value));
$('startFirst').onclick=()=>openChapter(book.chapters[0].id);
$('openBridge').onclick=()=>{showPanel('bridge');$('bridgePanel').scrollIntoView({block:'start'});};
$('openAtlas').onclick=()=>{showPanel('atlas');$('atlasPanel').scrollIntoView({block:'start'});};
$('openProject').onclick=()=>{showPanel('project');$('projectPanel').scrollIntoView({block:'start'});};
$('openResources').onclick=()=>{showPanel('resources');$('resourcesPanel').scrollIntoView({block:'start'});};
function renderBridge(){
  const root=$('bridgeTable');root.replaceChildren();
  const table=node('table'),thead=node('thead'),tr=node('tr');
  for(const header of ['对照主题','C语言写法','Python写法','关键差异'])tr.append(node('th',header));
  thead.append(tr);table.append(thead);
  const body=node('tbody');
  for(const row of book.cBridge){
    const tr=node('tr');
    for(const value of row){
      const td=node('td');
      const code=node('code',value);
      td.append(code);tr.append(td);
    }
    body.append(tr);
  }
  table.append(body);root.append(table);
}
function renderAtlas(){
  const term=$('atlasSearch').value.trim().toLowerCase();
  const root=$('atlasTable');root.replaceChildren();
  const table=node('table'),thead=node('thead'),tr=node('tr');
  for(const value of ['优先级','主题','语法与API','对应章节','ASW用途'])tr.append(node('th',value));
  thead.append(tr);table.append(thead);
  const tbody=node('tbody');
  for(const entry of book.syntaxAtlas){
    if(term && !entry.join(' ').toLowerCase().includes(term))continue;
    const row=node('tr');
    for(const v of entry)row.append(node('td',v));
    tbody.append(row);
  }
  table.append(tbody);root.append(table);
}
$('atlasSearch').addEventListener('input',renderAtlas);
function renderResources(){
  const root=$('resourcesList');root.replaceChildren();
  for(const r of book.resources){
    const block=node('div',undefined,'resource');
    const a=node('a',r.title);a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';
    block.append(a,node('small',r.type+' · '+r.topics));
    block.append(node('p',r.why));
    root.append(block);
  }
}
async function fetchProjectFile(name){
  if(!book.projectFiles.includes(name))throw Error('不在课程文件列表中');
  if(!fileCache.has(name)){
    const url=new URL('python-foundation-project/'+name,location.href);
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error('读取源码失败：'+name);
    fileCache.set(name,await response.text());
  }
  return fileCache.get(name);
}
async function openFile(name){
  activeFile=name;
  try{
    currentFileText=await fetchProjectFile(name);
    $('fileTitle').textContent=name+' · '+currentFileText.split('\n').length+'行';
    $('fileCode').textContent=currentFileText;
    $('fileNote').value=state.fileNotes[name]||'';
    $('fileSaveStatus').textContent='已读取源码；个人理解在此自动保存。';
    for(const b of $('fileNav').querySelectorAll('button')){
      b.classList.toggle('active',b.dataset.file===name);
    }
  }catch(error){$('fileCode').textContent='文件读取失败：'+error.message;}
}
function renderProject(){
  const flow=$('projectFlow');flow.replaceChildren();
  for(const [i,row] of book.callchain.entries()){
    if(i)flow.append(node('div','↓','flowArrow'));
    const block=node('div',undefined,'flowStep');
    block.append(node('strong',row.file+' · '+row.action),node('p',row.why));
    flow.append(block);
  }
  const nav=$('fileNav');nav.replaceChildren();
  for(const name of book.projectFiles){
    const b=node('button',name);b.dataset.file=name;b.onclick=()=>openFile(name);nav.append(b);
  }
  openFile(activeFile);
}
$('fileNote').addEventListener('input',()=>{
  state.fileNotes[activeFile]=$('fileNote').value;saveState();
});
$('copyFile').onclick=()=>copyText(currentFileText);
$('downloadFile').onclick=()=>safeDownload(activeFile,currentFileText,'text/plain;charset=utf-8');

function crc32(bytes){
  let crc=0xffffffff;
  for(const b of bytes){
    crc^=b;
    for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
function concat(chunks){
  const length=chunks.reduce((sum,x)=>sum+x.length,0),out=new Uint8Array(length);
  let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length;}
  return out;
}
/* 无第三方脚本依赖，生成标准ZIP STORE包；保留UTF-8源文件原样内容。 */
function buildZip(files){
  if(files.length>65535)throw Error('文件数量超出ZIP限制');
  const enc=new TextEncoder(),parts=[],central=[];
  let offset=0,centralSize=0;
  for(const f of files){
    const name=enc.encode(f.name),content=enc.encode(f.text),crc=crc32(content);
    const local=new Uint8Array(30),d=new DataView(local.buffer);
    d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);
    d.setUint16(6,0x0800,true);d.setUint16(8,0,true);
    d.setUint32(14,crc,true);d.setUint32(18,content.length,true);
    d.setUint32(22,content.length,true);d.setUint16(26,name.length,true);
    parts.push(local,name,content);
    const cent=new Uint8Array(46),c=new DataView(cent.buffer);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);
    c.setUint16(6,20,true);c.setUint16(8,0x0800,true);
    c.setUint32(16,crc,true);c.setUint32(20,content.length,true);
    c.setUint32(24,content.length,true);c.setUint16(28,name.length,true);
    c.setUint32(42,offset,true);
    central.push(cent,name);centralSize+=cent.length+name.length;
    offset+=local.length+name.length+content.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  v.setUint32(0,0x06054b50,true);
  v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);
  v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
  return concat([...parts,...central,end]);
}
$('downloadProject').onclick=async()=>{
  const b=$('downloadProject'),original=b.textContent;
  b.disabled=true;b.textContent='正在打包完整源码……';
  try{
    const files=await Promise.all(book.projectFiles.map(async name=>({
      name:'python-foundation-project/'+name,text:await fetchProjectFile(name)
    })));
    const zip=buildZip(files);
    safeDownload('Python_ASW_零基础练习工程.zip',zip,'application/zip');
  }catch(error){alert('下载失败：'+error.message);}
  finally{b.disabled=false;b.textContent=original;}
};
function renderFinal(){
  const root=$('finalChecklist');root.replaceChildren();
  for(const [i,label] of book.finalChecklist.entries()){
    const wrap=node('label',undefined,'checkItem');
    const check=document.createElement('input');check.type='checkbox';
    check.checked=!!state.checklist[i];
    check.onchange=()=>{state.checklist[i]=check.checked;saveState();};
    wrap.append(check,node('span',label));root.append(wrap);
  }
}
function makeSummary(){
  const chapters=book.chapters.filter(x=>state.done.includes(x.id));
  const lines=[
    '# Python零基础工程导学学习反馈',
    '章节自评：'+chapters.length+'/'+book.chapters.length,
    '本地真实Python运行情况：请由本人填写，网页不会自动推断。',
    '',
    '## 已标记章节',
    ...chapters.map(x=>'- '+x.title),
    '',
    '## 个人逐章笔记'
  ];
  for(const chapter of book.chapters){
    if(state.notes[chapter.id]?.trim())
      lines.push('### '+chapter.title,state.notes[chapter.id].trim());
  }
  lines.push('','## 划线批注');
  for(const a of state.annotations){
    lines.push('- '+a.chapter+'：'+a.quote+' / '+(a.note||''));
  }
  lines.push('','## 源码文件旁注');
  for(const [filename,note] of Object.entries(state.fileNotes)){
    if(note.trim())lines.push('### '+filename,note.trim());
  }
  lines.push('','## 本地验证待记录','- python main.py --input sample.csv：','- python -m unittest -v test_pipeline：','- 故障注入FAIL→修复PASS：');
  return lines.join('\n');
}
$('copySummary').onclick=()=>copyText(makeSummary()).then(ok=>{
  if(ok)alert('已复制学习反馈。打开原D15的笔记框粘贴保存后，可继续使用原D15的私有云同步。');
});
$('exportNotes').onclick=()=>{
  const payload={app:'asw-python-foundation',version:1,exportedAt:new Date().toISOString(),
    data:state};
  safeDownload('python-零基础学习笔记.json',JSON.stringify(payload,null,2)+'\n','application/json;charset=utf-8');
};
$('importNotes').onchange=async()=>{
  const input=$('importNotes'),file=input.files?.[0];
  if(!file)return;
  try{
    if(file.size>2_000_000)throw Error('笔记文件过大');
    const payload=JSON.parse(await file.text());
    if(payload.app!=='asw-python-foundation'||payload.version!==1||
       !payload.data||!Array.isArray(payload.data.done)||
       !payload.data.notes||!Array.isArray(payload.data.annotations)||
       !payload.data.fileNotes)throw Error('不是本导学页的正确笔记格式');
    if(!confirm('恢复这份备份会替换当前导学页的本地笔记，是否继续？'))return;
    state=Object.assign(stateDefault(),payload.data);saveState();
    hasOpenedChapter=false;renderChapterNav();openChapter(state.lastChapter||book.chapters[0].id);
    alert('笔记已恢复。原D15课程笔记未受到修改。');
  }catch(error){alert('无法导入：'+error.message);}
  finally{input.value='';}
};
async function init(){
  try{
    const response=await fetch('./python-foundation-content.json?v=20261110-v1',{cache:'no-store'});
    if(!response.ok)throw Error('教程教材数据未能加载');
    book=await response.json();
    if(book.chapters.length!==23 || book.chapters.some(x=>!Array.isArray(x.deepDive)||x.deepDive.length<4))throw Error('23章逐语法教材不完整');
    $('heroIntro').textContent='23章中文细讲、144个独立语法小节、符号与调用链逐行拆解、26类语法地图和可下载的ASW工程；这是一页可以分次学习的完整参考教材。';
    for(const t of book.principles)$('principles').append(node('p',t));
    for(const item of book.schedule){
      const card=node('div',undefined,'scheduleCard');
      card.append(node('b',item.label),node('div',item.time+' · '+item.chapters),
        node('div',item.outcome));$('scheduleCards').append(card);
    }
    state=loadState();renderChapterNav();
    openChapter(book.chapters.some(x=>x.id===state.lastChapter)?state.lastChapter:'start');
    document.body.dataset.foundationReady='yes';
  }catch(error){
    $('heroIntro').textContent='页面加载失败：'+error.message+'。请刷新页面或查看GitHub Pages部署状态。';
    $('progressLine').textContent='课程资源加载异常，原D15及其笔记不受影响。';
    console.error(error);
  }
}
init();
