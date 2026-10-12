'use strict';
const $=id=>document.getElementById(id);
let state=null,lesson=null,day=1,saveTimer=null,saveChain=Promise.resolve(),dirty=false,busy=false;
let codeView='original';
const draftKey=d=>'asw-pages-draft:'+location.pathname+':'+d;
const message=text=>{$('message').textContent=text;};
async function api(url,data){
  if(window.pagesAPI)return window.pagesAPI(url,data);
  const options=data?{method:'POST',headers:{'Content-Type':'application/json','X-Learning-Token':state.token},body:JSON.stringify(data)}:{};
  const res=await fetch(url,options),result=await res.json();
  if(!res.ok)throw Error(result.error||'本地服务未响应。');return result;
}
function tab(name){
  for(const n of ['learn','run','test']){$(n).hidden=n!==name;$('tab-'+n).setAttribute('aria-selected',String(n===name));}
}
for(const n of ['learn','run','test'])$('tab-'+n).onclick=()=>tab(n);
$('goRun').onclick=()=>{tab('run');$('tab-run').focus();};
$('goTest').onclick=()=>{tab('test');$('tab-test').focus();};
function rememberDraft(){
  try{localStorage.setItem(draftKey(day),JSON.stringify({notes:$('notes').value,feedback:$('feedback').value,code_notes:$('codeNotes').value}));}catch(e){}
  dirty=true;$('saveStatus').textContent='正在等待自动保存…';
  clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveNotes().catch(e=>message(e.message)),650);
}
async function saveNotes(){
  clearTimeout(saveTimer);if(!lesson||!dirty)return saveChain;
  const d=day,notes=$('notes').value,feedback=$('feedback').value,code_notes=$('codeNotes').value;
  const job=saveChain.catch(()=>{}).then(async()=>{
    await api('/api/notes',{day:d,notes,feedback,code_notes});
    if(day===d&&$('notes').value===notes&&$('feedback').value===feedback&&$('codeNotes').value===code_notes){
      dirty=false;$('saveStatus').textContent='已保存到当前浏览器 · '+new Date().toLocaleTimeString('zh-CN');
      try{localStorage.removeItem(draftKey(d));}catch(e){}
    }
  });saveChain=job;
  try{return await job;}catch(e){$('saveStatus').textContent='保存失败，草稿仍保留；请重试。';throw e;}
}
for(const id of ['notes','feedback','codeNotes'])$(id).addEventListener('input',rememberDraft);
$('codeNotes').addEventListener('input',resizeCodeNotes);
$('saveNotes').onclick=()=>saveNotes().then(()=>message('笔记和流程反馈已保存。')).catch(e=>message(e.message));
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

function drawRoute(){
  const n=state.progress.length;$('progress').textContent=`完成 ${n}/84 天 · 已发布 ${state.courses.filter(c=>c.published).length} 课`;
  $('routeSummary').textContent=`· 当前可推进到 D${String(state.frontier).padStart(2,'0')}`;
  $('days').replaceChildren();
  for(const c of state.courses){const b=document.createElement('button');
    const status=c.completed?(c.method==='test'&&state.progress.find(p=>p.day===c.day)?.source==='local-c'?'本地真实C已通过':c.method==='test'?'在线练习通过':'手动通关'):!c.unlocked?'未解锁':!c.published?'待准备':'可学习';
    b.textContent=`D${String(c.day).padStart(2,'0')} · ${c.title} · ${status}`;
    if(c.day===day)b.className='current';b.onclick=()=>selectDay(c.day).catch(e=>message(e.message));$('days').append(b);}
}
function completeUI(){
  const p=state.progress.find(p=>p.day===day);
  $('completion').textContent=p?(p.method==='test'&&p.source==='local-c'?'✓ 本地真实C已通过（已同步）':p.method==='test'?'✓ 在线练习通过':'✓ 自定义通关'):'尚未通关';
  $('next').hidden=!p;
  $('enterNext').hidden=!(p&&state.courses[day]?.published&&state.courses[day]?.unlocked);
  if(p){const c=state.courses[day];$('nextTitle').textContent=`D${String(day).padStart(2,'0')} 已完成`;
    $('nextText').textContent=c?`下一课：${c.title}。${c.published?'已准备，可从学习路线进入。':'你的通关已保存。把报告和流程反馈发给聊天后，我会准备下一课；刷新即可看到新内容。'}`:'全部计划已完成，可以整理作品集和下一阶段计划。';}
}
$('enterNext').onclick=()=>selectDay(day+1).catch(e=>message(e.message));
function steps(id,items){$(id).replaceChildren();for(const text of items||[]){const li=document.createElement('li');li.textContent=text;$(id).append(li);}}
function makeTable(headers,rows){const wrap=document.createElement('div'),t=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');wrap.className='table-wrap';for(const text of headers){const th=document.createElement('th');th.scope='col';th.textContent=text;tr.append(th);}head.append(tr);t.append(head);const body=document.createElement('tbody');for(const row of rows){const tr=document.createElement('tr');for(const text of row){const td=document.createElement('td');td.textContent=text;tr.append(td);}body.append(tr);}t.append(body);wrap.append(t);return wrap;}
function coloredCode(target,source,firstLine=1){
  target.replaceChildren();let line,content,lineNo=firstLine;
  function newLine(){line=document.createElement('span');line.className='code-line';line.dataset.line=lineNo;const n=document.createElement('span');n.className='line-number';n.textContent=lineNo++;n.setAttribute('aria-hidden','true');content=document.createElement('span');line.append(n,content);target.append(line);}newLine();
  // 先识别完整注释和字符串，再识别语法；不使用innerHTML，用户文本不会变成HTML。
  // L/UL/ULL等后缀也必须保留；最后一项逐字符兜底，未知语法不能被丢弃。
  const token=/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(?:0[xX][\da-fA-F]+|\b(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)[uUlLfF]*|\b[a-zA-Z_]\w*\b|[\s\S]/g;
  for(const match of source.matchAll(token)){const t=match[0];let cls='';
    if(t.startsWith('/*')||t.startsWith('//'))cls='syntax-comment';else if(t[0]==='"'||t[0]==="'")cls='syntax-string';else if(/^\d/.test(t))cls='syntax-number';
    else if(/^(if|else|for|return|const|typedef|enum|struct|static|sizeof)$/.test(t))cls='syntax-keyword';else if(/^(int|float|double|void|char|long|size_t|uint8_t|uint32_t|unsigned)$/.test(t))cls='syntax-type';else if(/^(scanf|printf|roundf|isfinite|Encode|Decode|EncodeTemp|DecodeTemp|Codec_Encode|Codec_Decode|PrintFrame|PrintBits|main|AnalyzeSpeeds|Acc_Process)$/.test(t))cls='syntax-function';
    t.split('\n').forEach((part,i)=>{if(i)newLine();if(part){const span=document.createElement('span');span.className=cls;span.textContent=part;content.append(span);}});
  }
}
let stepIndex=0;
function paragraphs(target,text){for(const value of text.split('\n')){const p=document.createElement('p');p.textContent=value;target.append(p);}}
function showStep(index){
  stepIndex=index;const s=lesson.code_sections[index],start=lesson.code.indexOf(s.start),end=lesson.code.indexOf(s.end,start+s.start.length);
  const finish=end<0?lesson.code.length:s.end.startsWith('    return 0;')?end+'    return 0;\n}'.length:end;
  $('stepTitle').textContent=s.title;coloredCode($('stepCode'),lesson.code.slice(start,finish).trimEnd(),lesson.code.slice(0,start).split('\n').length);
  $('stepExplanation').replaceChildren();for(const [title,text] of [['先看通用语法',s.pattern],['这一段承担什么职责',s.text],['用具体值走一遍',s.trace]]){const h=document.createElement('h4');h.textContent=title;$('stepExplanation').append(h);paragraphs($('stepExplanation'),text);}
  [...$('codeSteps').children].forEach((b,i)=>{b.classList.toggle('current',i===index);b.setAttribute('aria-pressed',String(i===index));});$('prevStep').disabled=index===0;$('nextStep').disabled=index===lesson.code_sections.length-1;$('stepPosition').textContent=`${index+1} / ${lesson.code_sections.length}`;
}
$('prevStep').onclick=()=>showStep(stepIndex-1);$('nextStep').onclick=()=>showStep(stepIndex+1);
function renderCode(){
  $('downloadProject')?.remove();
  coloredCode($('code'),lesson.code);
  codeView='original';$('code').hidden=false;$('codeNotesLabel').hidden=true;
  $('architectureFlow').textContent=lesson.flow_text||'main入口 → 输入 → 业务函数 → 状态返回 → main决定是否显示结果';
  $('architectureTable').replaceChildren(makeTable(lesson.architecture?.headers||['角色','职责','输入／输出'],lesson.architecture?.rows||[['main','读取输入、调用函数、检查状态','参数进来；日志出去'],['业务函数','先校验，再计算或编码','参数和数组地址；状态码与输出数据'],['打印函数／界面','展示结果','只展示，不决定数据是否合法']]));
  $('executionFlow').textContent=lesson.flow_text||'main创建变量 → 读输入 → 调用业务函数（main暂停）→ 校验与计算 → 返回main → 检查状态后使用结果';
  $('remediationTitle').textContent=lesson.remediation_title||'开课补习 · 先看本课所需基础';
  $('walkthrough').hidden=!lesson.code_sections;$('codeSteps').replaceChildren();
  if(lesson.code_sections){$('remediationText').replaceChildren();paragraphs($('remediationText'),lesson.reading[0].text);if(lesson.protocol)$('remediationText').append(makeTable(lesson.protocol.headers,lesson.protocol.rows));lesson.code_sections.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.title;b.onclick=()=>showStep(i);$('codeSteps').append(b);});showStep(0);}
  $('codeFile').textContent='C17 · '+lesson.source;$('code').classList.add('expanded');$('expandCode').textContent='折叠长代码';$('expandCode').setAttribute('aria-expanded','true');
  $('codeIntegrity').textContent=`课程原版共 ${lesson.code.split('\n').length} 行，已默认展开到最后一行；使用页面滚动查看。下载源码与这里的课程原版一致。`;
}
function resizeCodeNotes(){const el=$('codeNotes');if(!el||el.closest('[hidden]'))return;el.style.height='auto';el.style.height=Math.max(500,el.scrollHeight+6)+'px';}
function showCodeView(view){
  codeView=view;$('codeNotesLabel').hidden=view!=='edit';$('code').hidden=view==='edit';
  if(view==='edit')resizeCodeNotes();
  else coloredCode($('code'),view==='personal'?$('codeNotes').value:lesson.code);
  $('codeIntegrity').textContent=view==='original'?`课程原版共 ${lesson.code.split('\n').length} 行。完整源码，默认展开；运行使用这一版。`:`我的注释代码共 ${$('codeNotes').value.split('\n').length} 行。停止输入后自动保存；云同步保留历史版本。`;
}
$('originalCode').onclick=()=>showCodeView('original');
$('editCodeNotes').onclick=()=>{showCodeView('edit');$('codeNotes').focus();};
$('previewCodeNotes').onclick=()=>showCodeView('personal');
$('downloadCodeNotes').onclick=async()=>{try{await saveNotes();download($('codeNotes').value,`D${String(day).padStart(2,'0')}-我的注释.c`,'text/plain;charset=utf-8');}catch(e){message(e.message);}};
function renderBitLab(){
  const target=$('bitLab');target.replaceChildren();target.hidden=day!==4;if(day!==4)return;
  const title=document.createElement('h3');title.textContent='点一下bit，就能看见移位、合并与提取';target.append(title);
  const intro=document.createElement('p');intro.textContent='先选模式和雷达，看它们如何组合。再点下面某一位，将0/1翻转；每个位号、权重和职责都列出来。本演示帮助理解，不计入通关运行记录。';target.append(intro);
  const fields=document.createElement('div');fields.className='input-grid';
  function select(id,label,options,value){const l=document.createElement('label'),s=document.createElement('select');l.textContent=label;s.id=id;for(const [v,text] of options){const o=document.createElement('option');o.value=v;o.textContent=text;s.append(o);}s.value=value;l.append(s);fields.append(l);return s;}
  const mode=select('bitMode','模式：占bit0—1',[[0,'0 · 00'],[1,'1 · 01'],[2,'2 · 10']],1);
  const radar=select('bitRadar','雷达：先是0/1，后移到bit2',[[0,'0 · 无效'],[1,'1 · 有效']],1);
  target.append(fields);
  const pack=document.createElement('div'),buttons=document.createElement('div'),summary=document.createElement('p'),calcs=document.createElement('div');buttons.className='bit-buttons';buttons.id='bitButtons';summary.id='bitSummary';summary.setAttribute('aria-live','polite');target.append(pack,buttons,summary);
  let control=5;const binary=n=>(n&255).toString(2).padStart(8,'0');
  const op=select('bitOperation','对当前控制字节再做一项操作',[[0,'| 3：强制模式两位为1'],[1,'| 8：保留bit3置1'],[2,'^ 4：翻转雷达bit2'],[3,'& ~4：清除雷达bit2']],0);
  const apply=document.createElement('button'),reset=document.createElement('button'),operationTrace=document.createElement('pre');apply.textContent='执行这项位操作';apply.id='bitApply';reset.textContent='恢复所选模式和雷达';reset.id='bitReset';operationTrace.id='bitTrace';operationTrace.textContent='执行操作后，这里会保留“操作前 → 掩码 → 操作后”的逐位对照。';
  const row=document.createElement('div');row.className='row';row.append(apply,reset);target.append(row,operationTrace,calcs);
  function draw(){
    const m=Number(mode.value),r=Number(radar.value),shift=r<<2;pack.replaceChildren(makeTable(['阶段','8位展示（左bit7，右bit0）','十进制／含义'],[['mode',binary(m),m],['radar未移位',binary(r),r],['radar << 2',binary(shift),shift+'：移到权重4的位置'],['mode | (radar << 2)',binary(m|shift),m|shift]]));
    buttons.replaceChildren();for(let bit=7;bit>=0;bit--){const b=document.createElement('button'),value=(control>>>bit)&1;b.className=bit>2?'bit-reserved':bit===2?'bit-radar':'bit-mode';b.textContent=`bit${bit}\n${value}\n权重${2**bit}\n${bit>2?'保留':bit===2?'雷达':'模式'}`;b.setAttribute('aria-label',`bit${bit} 当前${value} 点击翻转`);b.setAttribute('aria-pressed',String(value===1));b.onclick=()=>{const before=control;control^=1<<bit;operationTrace.textContent=`翻转bit${bit}：\n  ${binary(before)} (${before})\n^ ${binary(1<<bit)} (${1<<bit})\n= ${binary(control)} (${control})`;draw();};buttons.append(b);}
    const extracted=control&3,valid=(control&248)===0&&extracted<=2;summary.textContent=`当前控制：${binary(control)} = 十进制${control} = 十六进制${control.toString(16).toUpperCase().padStart(2,'0')}。${valid?'布局合法':'布局非法：'+((control&248)!==0?'保留位非零':'模式3未定义')}。雷达0表示无效，但它本身是合法协议值。`;summary.className=valid?'pass':'fail';
    calcs.replaceChildren(makeTable(['要回答的问题','实际位运算','结果'],[['模式是多少？',`${binary(control)} & 00000011`,extracted],['雷达0/1？',`(${binary(control)} >> 2) & 00000001`,(control>>>2)&1],['保留位是否污染？',`${binary(control)} & 11111000`,control&248]]));
  }
  function restore(){control=Number(mode.value)|(Number(radar.value)<<2);operationTrace.textContent='已按所选模式与雷达重新组合；现在可以点某一bit或执行位操作。';draw();}
  mode.onchange=restore;radar.onchange=restore;reset.onclick=restore;
  apply.onclick=()=>{const before=control,choice=Number(op.value),mask=[3,8,4,251][choice],symbol=['|','|','^','&'][choice];control=[()=>control|3,()=>control|8,()=>control^4,()=>control&~4][choice]()&255;operationTrace.textContent=`${choice===3?'~4仅展示低8位；实际取反按参与类型宽度执行。\n':''}  ${binary(before)} (${before})\n${symbol} ${binary(mask)} (${mask})\n= ${binary(control)} (${control})`;draw();};draw();
}
$('expandCode').onclick=()=>{const expanded=$('code').classList.toggle('expanded');$('expandCode').textContent=expanded?'收起代码高度':'展开全部';$('expandCode').setAttribute('aria-expanded',String(expanded));};
$('jumpMain').onclick=()=>{const index=lesson.code.split('\n').findIndex(line=>line.startsWith('int main('));const line=$('code').querySelector(`[data-line="${index+1}"]`);$('code').querySelectorAll('.selected-line').forEach(l=>l.classList.remove('selected-line'));if(line){line.classList.add('selected-line');line.scrollIntoView({block:'center'});}};
function renderFields(id,fields,prefix=''){
  $(id).replaceChildren();for(const f of fields){const label=document.createElement('label');label.textContent=f.label;const el=document.createElement(f.kind==='select'?'select':'input');el.id=prefix+f.id;
    if(f.kind==='select'){if(prefix){const o=document.createElement('option');o.value='';o.textContent='请选择';el.append(o);}for(const [value,text] of f.options){const o=document.createElement('option');o.value=value;o.textContent=text;el.append(o);}}
    else{el.type=f.kind==='text'?'text':'number';el.step=f.step||'any';el.inputMode='decimal';}
    el.value=prefix?'':f.value??'';label.append(el);$(id).append(label);
  }
}
function drawChecklist(items){for(const id of ['runChecklist','testChecklist']){$(id).replaceChildren();for(const c of items){const row=document.createElement('div'),span=document.createElement('span');row.className='checklist-row';span.textContent=`${c.passed?'✓ 已运行':'○ 待运行'} · ${c.label}`;span.className=c.passed?'pass':'muted';row.append(span);if(!c.passed){const b=document.createElement('button');b.type='button';b.textContent='去运行';b.className='small';b.onclick=()=>{setInputs(c.values,`通关实验：${c.label}。输入已经填好，现在点击运行案例。`);tab('run');$('runButton').focus();};row.append(b);}$(id).append(row);}}}
async function refreshChecklist(){const result=await api('/api/checklist?day='+day);drawChecklist(result.experiments);}
async function selectDay(d){
  if(busy){message('正在运行或检测，请等待完成后再换课程。');return;}
  if(dirty)await saveNotes();
  const c=state.courses[d-1];
  if(!c.unlocked){message(`D${String(d).padStart(2,'0')} 尚未解锁：先完成前一天的检测，或对当前日自定义通关。`);return;}
  if(!c.published){$('workspace').hidden=true;$('waiting').hidden=false;$('waitingTitle').textContent=`D${String(d).padStart(2,'0')} · ${c.title}`;$('waitingText').textContent='前一天通关已记录。下一课会根据你的学习结果与反馈补充。回到当前课程，下载报告或复制下一课请求发给聊天。';return;}
  const result=await api('/api/lesson?day='+d);day=d;lesson=result.lesson;const record=result.record;
  $('waiting').hidden=true;$('workspace').hidden=false;$('dayTag').textContent=`D${String(day).padStart(2,'0')} · 第${c.week}周 · ${c.stage}`;
  $('title').textContent=lesson.title;$('summary').textContent=lesson.summary;$('time').textContent=lesson.time;
  $('goals').replaceChildren();for(const goal of lesson.goals){const li=document.createElement('li');li.textContent=goal;$('goals').append(li);}
  renderCode();renderBitLab();$('reading').replaceChildren();
  for(const r of (lesson.code_sections?lesson.reading.slice(1):lesson.reading)){const section=document.createElement('section'),h=document.createElement('h3');h.textContent=r.title;section.append(h);for(const text of r.text.split('\n')){const p=document.createElement('p');p.textContent=text;section.append(p);}if(r.table)section.append(makeTable(r.table.headers,r.table.rows));for(const source of r.sources||[]){const p=document.createElement('p'),a=document.createElement('a');a.textContent=source.title;a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';p.append(a);section.append(p);}$('reading').append(section);}
  for(const asset of lesson.assets||[]){const section=document.createElement('section'),h=document.createElement('h3'),pre=document.createElement('pre'),button=document.createElement('button');h.textContent='完整文件 · '+asset.name;pre.textContent=asset.text;pre.style.maxHeight='none';button.textContent='下载 '+asset.name;button.onclick=()=>download(asset.text,asset.name,'text/plain;charset=utf-8');section.append(h,pre,button);$('reading').append(section);}
  if(lesson.project_name){const button=document.createElement('button');button.textContent='下载完整项目ZIP';button.id='downloadProject';button.className='primary';button.onclick=()=>download(projectZip(lesson.assets,lesson.project_name),lesson.project_name+'.zip','application/zip');$('architecture').append(button);}
  if(lesson.reference){const section=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p');h.textContent='独立工具实测参考 · 不是浏览器现场运行';p.textContent=`工具cantools ${lesson.reference.version}，实际读取DBC；每行同时与手工C和协议向量一致。`;section.append(h,p,makeTable(['输入速度／模式／雷达','factor／offset／width','工具编码字节','工具解码速度'],lesson.reference.vectors.map(v=>[v.values.slice(0,3).join(' / '),`${v.factor} / ${v.offset} / ${v.width}`,v.frame.map(x=>x.toString(16).toUpperCase().padStart(2,'0')).join(' '),v.decoded])));$('reading').append(section);}
  renderFields('runFields',lesson.run_fields);renderFields('answerFields',lesson.practice.fields,'answer-');
  steps('labSteps',lesson.lab_steps);steps('testSteps',lesson.test_steps);steps('practiceSteps',lesson.practice.steps);
  $('presets').replaceChildren();for(const e of lesson.experiments){const b=document.createElement('button');b.textContent=e.name;b.onclick=()=>setInputs(e.values,e.hint,e.steps);$('presets').append(b);}
  setInputs(lesson.experiments[0].values,lesson.experiments[0].hint,lesson.experiments[0].steps);drawChecklist(result.experiments);
  $('notes').value=record.notes;$('feedback').value=record.feedback;$('codeNotes').value=record.code_notes||lesson.code;dirty=false;
  try{const draft=JSON.parse(localStorage.getItem(draftKey(day))||'null');if(draft){$('notes').value=draft.notes;$('feedback').value=draft.feedback;$('codeNotes').value=draft.code_notes??record.code_notes??lesson.code;dirty=true;}}catch(e){}
  $('saveStatus').textContent=dirty?'已恢复未保存草稿，请立即保存。':record.updated?'已从电脑读取笔记':'尚无笔记';
  $('passRule').textContent=lesson.pass_rule;$('practiceText').textContent=lesson.practice.text;
  $('questions').replaceChildren();for(const [qi,q] of lesson.questions.entries()){const f=document.createElement('fieldset'),leg=document.createElement('legend');f.className='question';leg.textContent=`第${qi+1}题（${q.id}） · ${q.text}`;f.append(leg);q.options.forEach((o,i)=>{const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');input.type='radio';input.name=q.id;input.value=i;span.textContent=`${String.fromCharCode(65+i)}. ${o}`;label.append(input,span);f.append(label);});$('questions').append(f);}
  $('output').replaceChildren();const empty=document.createElement('p');empty.className='muted';empty.textContent='选一个场景，点击运行。';$('output').append(empty);
  $('engine').textContent='';$('runStatus').textContent='';$('prediction').value='';$('overrideReason').value='';$('result').replaceChildren();$('requestFallback').hidden=true;
  if(record.attempt){const answers=JSON.parse(record.attempt.answers);for(const q of lesson.questions){const value=answers[q.id];const input=$('quiz').querySelector(`input[name="${q.id}"][value="${value}"]`);if(input)input.checked=true;}for(const f of lesson.practice.fields)$('answer-'+f.id).value=answers[f.id]??'';const priorResult=JSON.parse(record.attempt.result);if(record.attempt.source==='local-c')priorResult.source='local-c';showResult(priorResult);}
  drawRoute();completeUI();tab('learn');message('');
}
$('backCurrent').onclick=()=>selectDay(day).catch(e=>message(e.message));
function setInputs(values,hint,guide){lesson.run_fields.forEach((f,i)=>$(f.id).value=values[i]);$('hint').textContent=hint||'';steps('experimentSteps',guide||['输入已经填好。','先写自己的预测，再点击运行案例。','检查结果后回到做检测继续。']);}
$('transferRun').onclick=()=>{setInputs(lesson.practice.values,'迁移实验：输入已填好。请先保留你的手算答案，再点击运行案例。');tab('run');$('prediction').focus();};
function item(label,value,cls){const d=document.createElement('div'),l=document.createElement('div'),v=document.createElement('div');l.className='muted';l.textContent=label;v.className='value '+(cls||'');v.textContent=value;d.append(l,v);return d;}
$('runButton').onclick=async()=>{
  if(busy)return;busy=true;const b=$('runButton');b.disabled=true;b.textContent='正在浏览器模拟…';
  try{const values=lesson.run_fields.map(f=>$(f.id).value.trim());const result=await api('/api/run',{day,values});
    $('output').replaceChildren();const grid=document.createElement('div');grid.className='output-grid';
    let explanation,summaryText;
    if(lesson.runner==='module_day06'){
      grid.append(item('构建状态',result.build_status===0?'通过':'预期构建错误',result.build_status===0?'good':'bad'),item('当前阶段',['','编译阶段','链接阶段','运行阶段'][result.build_stage]),item('程序是否运行',result.program_ran?'是':'否'),item('测试阶段',result.test_passed?'通过':'未执行'));
      if(result.program_ran){grid.append(item('业务status',result.status,result.valid?'good':'bad'),item('结果valid',result.valid));if(result.valid)grid.append(item('raw',result.raw),item('还原车速km/h',result.decoded_speed.toFixed(1)));}
      explanation=!result.program_ran?({missing_definition:'声明已可见，但链接缺少codec实现；程序未生成，Codec_Encode没有执行。',duplicate_definition:'同一个外部函数有两份定义；链接报multiple definition。把实现归属一个库，不要重复加入。',header_redefinition:'无保护重复展开enum，在编译阶段重定义；恢复头文件保护。'}[result.error_kind]):!result.valid?'构建与独立测试已经通过；这次业务输入被长度或数值检查拒绝。构建成功与业务成功分开。':`模块正常调用：${values[0]}×10=${result.raw}；发送低高字节后解码${result.decoded_speed.toFixed(1)}km/h。demo和test分别链接，共享codec库。`;
      summaryText=`构建${result.build_status}，阶段${result.build_stage}，运行${result.program_ran}${result.program_ran?'，业务status'+result.status:''}`;
    }else if(lesson.runner==='dbc_day05'){
      grid.append(item('编码status',result.status,result.valid?'good':'bad'),item('编码valid',result.valid));
      if(result.factor!==undefined)grid.append(item('发送factor / offset',`${result.factor} / ${result.offset}`),item('字段位宽bit',result.width),item('raw最大可表示值',result.raw_limit));
      if(result.valid){grid.append(item('原始刻度raw',result.raw),item('控制字节',result.control),item('接收factor / offset',`${result.receive_factor} / ${result.receive_offset}`),item('解码status',result.decode_status,result.decode_valid?'good':'bad'));if(result.decode_valid)grid.append(item('还原速度km/h',result.decoded_speed.toFixed(2),'good'));}
      explanation=!result.valid?(result.status===-1?'载荷长度必须8，编码前拒绝。':`输入或位宽不满足约束：先检查车速0—250，再检查raw=round((speed-offset)/factor)是否能装入字段；${Number(values[4])===8?'8bit最多255，不能把大数截成一个字节发送。':'非法值拒绝，不显示帧。'}`):!result.decode_valid?'接收模式3或保留位污染，协议检查拒绝；不消费旧输出。':`发送raw=round((${values[0]}-(${result.offset}))/${result.factor})=${result.raw}；接收${result.raw}×${result.receive_factor}+(${result.receive_offset})=${result.decoded_speed.toFixed(2)}km/h。${Number(values[5])===3?'接收误用另一配置，即使status0也会得到错误物理值；核对DBC版本。':''}`;
      summaryText=`status=${result.status}${result.valid?`，raw${result.raw}，decode_status${result.decode_status}${result.decode_valid?'，车速'+result.decoded_speed+'km/h':''}`:''}`;
    }else if(lesson.runner==='bits_day04'){
      grid.append(item('编码状态status',result.status,result.valid?'good':'bad'),item('编码valid',result.valid));
      if(result.valid){grid.append(item('有符号刻度R',result.raw_signed),item('16位编码整数U',result.raw_unsigned),item('发送控制bit',result.control_bits),item('接收控制bit',result.received_bits),item('提取模式',result.extracted_mode),item('提取雷达0/1',result.extracted_radar),item('保留位检查值',result.reserved),item('解码状态',result.decode_status,result.decode_valid?'good':'bad'),item('错误无符号算法（℃，不能用）',result.unsigned_wrong.toFixed(1),'bad'));if(result.decode_valid)grid.append(item('有效还原温度（℃）',result.decoded_temperature.toFixed(1),'good'));}
      explanation=!result.valid?(result.status===-1?'长度不等于8，编码前拒绝；没有载荷。':'温度须有限且在-40—125℃，模式0—2，雷达0/1；编码拒绝。'):result.reserved!==0?`接收控制${result.received_control}&248=${result.reserved}，保留位污染；不输出有效温度。`:result.extracted_mode>2?'接收最低两位为11，模式3非法，解码拒绝。':!result.decode_valid?`接收整数U=${result.received_raw}；按补码还原R=${result.received_raw>=32768?result.received_raw-65536:result.received_raw}，超出-400—1250，拒绝。`:`接收U=${result.received_raw}；${result.received_raw>=32768?'减65536得到负刻度':'低于32768，刻度直接等于U'}；乘0.1得到${result.decoded_temperature.toFixed(1)}℃。${Number(values[3])===3?'本次位翻转仍通过，说明合法字段检查会漏检数值变化。':''}${result.extracted_radar===0?'雷达位0合法，但应用需要知道雷达数据无效。':''}`;
      summaryText=`编码status=${result.status}${result.valid?`，发送${result.frame.join(' ')}，接收${result.received_frame.join(' ')}，解码status=${result.decode_status}${result.decode_valid?'，温度'+result.decoded_temperature+'℃':''}`:''}`;
    }else if(lesson.runner==='can_day03'){
      grid.append(item('编码状态',result.status,result.valid?'good':'bad'),item('编码valid',result.valid));
      if(result.valid){grid.append(item('原始整数raw',result.raw),item('解码状态',result.decode_status,result.decode_valid?'good':'bad'),item('接收控制字节（十进制）',result.received_control));if(result.decode_valid)grid.append(item('还原车速（km/h）',result.decoded_speed.toFixed(1)));}
      explanation=!result.valid?(result.status===-1?'长度必须等于8，已在编码前拒绝；没有发送帧。':'车速须有限且在0—250，模式0—2，雷达0或1；编码拒绝，输出不可消费。'):!result.decode_valid?'编码成功，但接收模式位变为3，Decode拒绝；不使用解码输出。':`raw=round(${values[0]}×10)=${result.raw}；低字节=${result.raw}%256=${result.frame[0]}；高字节=取整(${result.raw}/256)=${result.frame[1]}；控制=${values[1]}+${values[2]}×4=${result.frame[2]}；还原=${result.raw}×0.1=${result.decoded_speed} km/h。`;
      summaryText=`编码status=${result.status}${result.valid?`，发送帧=${result.frame.map(v=>v.toString(16).toUpperCase().padStart(2,'0')).join(' ')}，解码status=${result.decode_status}`:''}`;
    }else if(lesson.runner==='array_day02'){
      grid.append(item('本次操作',result.valid?'成功':'拒绝',result.valid?'good':'bad'),item('返回状态',result.status),item('数组容量（个）',result.capacity));
      if(result.valid){grid.append(item('本次读取（个）',result.count),item('总和（km/h）',result.sum.toFixed(4)));if(result.has_data)grid.append(item('平均（km/h）',result.average.toFixed(4)));}
      explanation=!result.valid?(result.status===-1?'需要读取元素，却传入NULL。程序先拒绝，没有访问空地址。':'请求数量为负或超过容量5。程序先拒绝，没有越界读取。'):!result.has_data?'本次数量为0：操作成功，但没有数据，不做除法，不显示有效平均值。':`平均值 = 被读取元素总和 ${result.sum} ÷ 本次数量 ${result.count} = ${result.average.toFixed(4)} km/h。`;
      summaryText=`status=${result.status}，valid=${result.valid}${result.valid?`，数量=${result.count}，总和=${result.sum}${result.has_data?`，平均=${result.average}`:'，无平均值'}`:''}`;
    }else{
      const mode=['速度模式','间距模式','故障'][result.mode]||'未知';grid.append(item('模式',mode,result.valid?'good':'bad'),item('结果有效性',result.valid?'有效':'无效',result.valid?'good':'bad'),item('返回状态',result.status));
      if(result.valid)grid.append(item('速度（m/s）',result.speed_ms.toFixed(2)),item('期望间距（m）',result.desired.toFixed(2)),item('距离误差（m）',result.error.toFixed(2)));
      explanation=result.valid?`速度：${values[0]} ÷ 3.6 = ${result.speed_ms} m/s；期望：${values[2]} + ${values[3]} × ${result.speed_ms} = ${result.desired} m；误差：${values[1]} - ${result.desired} = ${result.error} m。${result.error>=0?'误差≥0，选速度模式。':'误差<0，选间距模式。'}`:'输入被拒绝：status=-2，valid=0，模式为故障；不消费本次间距或误差。';
      summaryText=`${mode}，status=${result.status}，valid=${result.valid}${result.valid?`，期望=${result.desired}m，误差=${result.error}m`:''}`;
    }
    $('output').append(grid);const p=document.createElement('p');p.textContent=explanation;$('output').append(p);
    if(lesson.runner==='module_day06'){
      $('output').append(makeTable(['构建顺序','本次结果'],[['1 · 预处理/编译',result.build_stage===1?'在这里失败':'编译阶段已通过'],['2 · 链接实现和依赖',result.build_stage===1?'未到此处':result.build_stage===2?'在这里失败':'demo/test分别链接完成'],['3 · 测试与运行',result.program_ran?'测试后运行demo':'程序未生成，不运行']]));
      if(result.frame)$('output').append(makeTable(['字节下标','十六进制','职责'],result.frame.map((v,i)=>[i,v.toString(16).toUpperCase().padStart(2,'0'),['车速低8位','车速高8位','模式与雷达'][i]||'保留0'])));
      const log=document.createElement('details'),heading=document.createElement('summary'),pre=document.createElement('pre');heading.textContent=window.pagesAPI?'查看模拟构建说明（没有执行编译器）':'查看真实构建与测试诊断';pre.textContent=result.compiler_log;log.append(heading,pre);$('output').append(log);
    }
    if(['bits_day04','dbc_day05'].includes(lesson.runner)&&result.frame){
      for(const [label,frame] of [['发送载荷 · 故障修改前',result.frame],['接收载荷 · 故障修改后',result.received_frame]]){const h=document.createElement('h4');h.textContent=label;$('output').append(h,makeTable(['字节下标','十进制','十六进制','8位二进制','职责'],frame.map((v,i)=>[i,v,v.toString(16).toUpperCase().padStart(2,'0'),v.toString(2).padStart(8,'0'),i<2?(lesson.runner==='dbc_day05'?(i===0?'车速低8位':Number(values[4])===8?'8位配置时保留0':'车速高8位'):Number(values[4])===1?(i===0?'温度高8位':'温度低8位'):(i===0?'温度低8位':'温度高8位')):i===2?'bit0—1模式、bit2雷达':'保留0'])));}
    }
    if(lesson.runner==='can_day03'&&result.frame){const caption=document.createElement('p');caption.textContent='发送前的8字节载荷（内存模拟；不连接实车）。损坏开关会在显示后修改接收控制位。';$('output').append(caption,makeTable(['字节下标','十进制','十六进制','二进制','职责'],result.frame.map((v,i)=>[i,v,v.toString(16).toUpperCase().padStart(2,'0'),v.toString(2).padStart(8,'0'),['车速低8位','车速高8位','模式bit0—1；雷达bit2'][i]||'保留，必须0'])));}
    if(lesson.runner==='array_day02'){
      if(result.visited?.length){let sum=0;const rows=result.visited.map((value,i)=>{sum+=value;return [String(i),String(value),String(sum)];});const intro=document.createElement('p');intro.textContent='按浏览器模拟读取的列表展开累加过程（不是额外读取数组）：';$('output').append(intro,makeTable(['下标i','读取车速（km/h）','累加后总和'],rows));}
      else if(result.valid){const empty=document.createElement('p');empty.textContent='本次没有读取任何下标。';$('output').append(empty);}
      if(result.pointer_bytes!==undefined){const size=document.createElement('p');size.className='muted';size.textContent=`模拟64位GCC环境（不是浏览器测量）：整块数组${result.array_bytes}字节，一个元素${result.element_bytes}字节，指针${result.pointer_bytes}字节。指针大小不是元素数量。`;$('output').append(size);}
    }
    const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='查看浏览器模拟数据';pre.textContent=result.stdout;details.append(summary,pre);$('output').append(details);$('engine').textContent=result.engine;$('runStatus').textContent='运行记录已保存到当前浏览器。';
    await refreshChecklist();
    if($('prediction').value.trim()){$('notes').value+=`\n\n[实验 ${new Date().toLocaleTimeString('zh-CN')}] 输入：${values.join(' / ')}\n预测：${$('prediction').value}\n实际：${summaryText}`;rememberDraft();await saveNotes();}
  }catch(e){message(e.message);$('runStatus').textContent='运行未完成，请检查提示后重试。';}finally{busy=false;b.disabled=false;b.textContent='运行案例';}
};
function showResult(result){
  $('result').replaceChildren();const h=document.createElement('h3');h.className=result.passed?'pass':'fail';h.textContent=result.passed?(result.source==='local-c'?'✓ 原本地真实C检测已通过':'✓ 今日检测通过（在线练习）'):'还没有通关：按下面提示补齐，再试一次';$('result').append(h);
  const names={q1:'地址',q2:'状态与输出',q3:'间距计算',q4:'const输入',q5:'无效结果',speed_ms:'迁移速度',desired:'迁移间距',error:'迁移误差',mode:'迁移模式',normal:'正常实验',fault:'故障实验',transfer:'迁移实验'};
  const ul=document.createElement('ul');ul.className='test-checks';for(const c of result.checks){const li=document.createElement('li');li.className=c.passed?'pass':'fail';const qi=lesson.questions.findIndex(q=>q.id===c.id);li.textContent=`${c.passed?'✓':'✗'} ${qi>=0?'第'+(qi+1)+'题（'+c.id+'） · ':''}${c.label||names[c.id]||c.id}：${c.passed?'通过':c.message}`;if(!c.passed&&c.values){const b=document.createElement('button');b.type='button';b.textContent='去运行';b.className='small';b.onclick=()=>{setInputs(c.values,`补齐实验：${c.label}；输入已填好，请点击运行案例。`);tab('run');$('runButton').focus();};li.append(document.createTextNode(' '),b);}ul.append(li);}$('result').append(ul);
  const det=document.createElement('details'),sum=document.createElement('summary');sum.textContent=`${result.source==='local-c'?'原本地真实C回归':'浏览器模拟回归'}：${result.tests.filter(t=>t.passed).length}/${result.tests.length}通过`;det.append(sum);
  for(const t of result.tests){const p=document.createElement('p');p.className=t.passed?'pass':'fail';p.textContent=`${t.passed?'✓':'✗'} ${t.name}`;det.append(p);}$('result').append(det);
}
$('quiz').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const b=$('gradeButton');b.disabled=true;b.textContent='正在检查答案与浏览器模拟测试…';
  try{await saveNotes();const answers={};for(const q of lesson.questions){const i=$('quiz').querySelector(`input[name="${q.id}"]:checked`);answers[q.id]=i?Number(i.value):null;}for(const f of lesson.practice.fields)answers[f.id]=$('answer-'+f.id).value;
    const result=await api('/api/grade',{day,answers});showResult(result);state=await api('/api/state');drawRoute();completeUI();message(result.passed?'通关已保存。写下流程反馈，再把报告发给聊天准备下一课。':'检测已保存。错误题和未运行的实验都有提示，可以继续重试。');
  }catch(e2){message(e2.message);}finally{busy=false;b.disabled=false;b.textContent='提交在线练习并检查模拟用例';}
};
$('overrideButton').onclick=async()=>{if(busy){message('检测或运行正在进行，请等待结束。');return;}try{await saveNotes();await api('/api/override',{day,reason:$('overrideReason').value});state=await api('/api/state');drawRoute();completeUI();message('已记录为自定义通关。后续仍可补做检测，升级为在线练习通过。');}catch(e){message(e.message);}};
async function copy(text,fallback){try{await navigator.clipboard.writeText(text);message('已复制，可粘贴到聊天。');}catch(e){if(fallback){fallback.hidden=false;fallback.value=text;fallback.select();message('请复制下方已选中的文本。');}else message('复制失败，请直接选择代码复制。');}}
$('copyCode').onclick=()=>copy(lesson.code);
$('downloadCode').onclick=()=>download(lesson.code,lesson.source,'text/plain;charset=utf-8');
$('downloadLesson').onclick=()=>{
  const parts=['# '+lesson.title,'\n'+lesson.summary,'\n'+lesson.time,'## 整体架构',lesson.flow_text||$('executionFlow').textContent,JSON.stringify(lesson.architecture||{},null,2),'## 完整中文源码','```c\n'+lesson.code+'```'];
  for(const asset of lesson.assets||[])parts.push('## '+asset.name,'```\n'+asset.text+'\n```');
  for(const r of lesson.reading){parts.push('## '+r.title,r.text);for(const source of r.sources||[])parts.push(`[${source.title}](${source.url})`);if(r.table)parts.push(JSON.stringify(r.table,null,2));}
  for(const s of lesson.code_sections||[]){const start=lesson.code.indexOf(s.start),end=lesson.code.indexOf(s.end,start+s.start.length),finish=s.end.startsWith('    return 0;')?end+'    return 0;\n}'.length:end;parts.push('## '+s.title,'```c\n'+lesson.code.slice(start,finish)+'\n```','通用语法：'+s.pattern,s.text,'具体值：'+s.trace);}
  for(const e of lesson.experiments)parts.push('## 实验：'+e.name,'输入：'+e.values.join(' '),...e.steps);
  parts.push('## 迁移任务',lesson.practice.text,...lesson.practice.steps,'## 自测题（不附答案）',...lesson.questions.map(q=>q.text+'\n'+q.options.map((o,i)=>`${i+1}. ${o}`).join('\n')));
  download(parts.join('\n\n'),`D${String(day).padStart(2,'0')}-完整讲义.md`,'text/markdown;charset=utf-8');
};
$('copyRequest').onclick=async()=>{try{await saveNotes();const status=state.progress.find(p=>p.day===day);const request=`我完成了D${String(day).padStart(2,'0')}的在线练习（${status?.method==='test'?'浏览器练习通过':'尚未检测或自定义通关'}；不是本地真实C通关）。请根据以下笔记检查薄弱项，制作下一课，并更新Pages课程。\n\n我的笔记：\n${$('notes').value.slice(0,8000)}\n\n希望优化：\n${$('feedback').value||'暂未填写'}\n\n我的源码注释（个人副本）：\n${$('codeNotes').value===lesson.code?'未修改':$('codeNotes').value.slice(0,20000)}\n\n保持：整体架构、完整中文代码、执行链、代码旁解释、代码注释自动保存、题号、详细实作、真实C在本地完成。`;await copy(request,$('requestFallback'));}catch(e){message(e.message);}};
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function projectZip(assets,folder){
  // 无外部库的ZIP存储模式；只打包公开课程assets，绝不加入个人笔记或授权。
  const encoder=new TextEncoder(),chunks=[],central=[];let offset=0;
  function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
  for(const asset of assets){const name=encoder.encode(folder+'/'+asset.name),body=encoder.encode(asset.text),checksum=crc(body),header=new Uint8Array(30),v=new DataView(header.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(12,0x5d4c,true);v.setUint32(14,checksum,true);v.setUint32(18,body.length,true);v.setUint32(22,body.length,true);v.setUint16(26,name.length,true);chunks.push(header,name,body);
    const entry=new Uint8Array(46),e=new DataView(entry.buffer);e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x0800,true);e.setUint16(14,0x5d4c,true);e.setUint32(16,checksum,true);e.setUint32(20,body.length,true);e.setUint32(24,body.length,true);e.setUint16(28,name.length,true);e.setUint32(42,offset,true);central.push(entry,name);offset+=header.length+name.length+body.length;
  }
  const size=central.reduce((sum,b)=>sum+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,assets.length,true);e.setUint16(10,assets.length,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);chunks.push(...central,end);const result=new Uint8Array(offset+size+22);let i=0;for(const chunk of chunks){result.set(chunk,i);i+=chunk.length;}return result;
}
async function exportReport(){await saveNotes();const text=await api('/api/report?day='+day);download(text,`D${String(day).padStart(2,'0')}-在线练习报告.md`,'text/markdown;charset=utf-8');}
for(const id of ['exportReport','reportSide'])$(id).onclick=()=>exportReport().catch(e=>message(e.message));
$('backup').onclick=async()=>{try{await saveNotes();const data=await api('/api/backup');download(JSON.stringify(data,null,2),'智驾学习数据备份.json','application/json');message('全部学习数据已导出。');}catch(e){message(e.message);}};
async function start(){try{state=await api('/api/state');drawRoute();const ready=state.courses.filter(c=>c.unlocked&&c.published);const current=ready.find(c=>!c.completed)||ready[ready.length-1];if(!current)throw Error('尚无已发布课程。');await selectDay(current.day);}catch(e){message('在线课程读取失败：'+e.message+' 请检查网络与站点资源，再刷新。');}}
window.pagesAppReady=start();
