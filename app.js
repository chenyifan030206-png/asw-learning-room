'use strict';
const $=id=>document.getElementById(id);
let state=null,lesson=null,day=1,saveTimer=null,saveChain=Promise.resolve(),dirty=false,busy=false;
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
  try{localStorage.setItem(draftKey(day),JSON.stringify({notes:$('notes').value,feedback:$('feedback').value}));}catch(e){}
  dirty=true;$('saveStatus').textContent='正在等待自动保存…';
  clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveNotes().catch(e=>message(e.message)),650);
}
async function saveNotes(){
  clearTimeout(saveTimer);if(!lesson||!dirty)return saveChain;
  const d=day,notes=$('notes').value,feedback=$('feedback').value;
  const job=saveChain.catch(()=>{}).then(async()=>{
    await api('/api/notes',{day:d,notes,feedback});
    if(day===d&&$('notes').value===notes&&$('feedback').value===feedback){
      dirty=false;$('saveStatus').textContent='已保存到当前浏览器 · '+new Date().toLocaleTimeString('zh-CN');
      try{localStorage.removeItem(draftKey(d));}catch(e){}
    }
  });saveChain=job;
  try{return await job;}catch(e){$('saveStatus').textContent='保存失败，草稿仍保留；请重试。';throw e;}
}
for(const id of ['notes','feedback'])$(id).addEventListener('input',rememberDraft);
$('saveNotes').onclick=()=>saveNotes().then(()=>message('笔记和流程反馈已保存。')).catch(e=>message(e.message));
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

function drawRoute(){
  const n=state.progress.length;$('progress').textContent=`完成 ${n}/84 天 · 已发布 ${state.courses.filter(c=>c.published).length} 课`;
  $('routeSummary').textContent=`· 当前可推进到 D${String(state.frontier).padStart(2,'0')}`;
  $('days').replaceChildren();
  for(const c of state.courses){const b=document.createElement('button');
    const status=c.completed?(state.progress.find(p=>p.day===c.day)?.source==='local-c'?'本地真实C已通过':c.method==='test'?'在线练习通过':'手动通关'):!c.unlocked?'未解锁':!c.published?'待准备':'可学习';
    b.textContent=`D${String(c.day).padStart(2,'0')} · ${c.title} · ${status}`;
    if(c.day===day)b.className='current';b.onclick=()=>selectDay(c.day).catch(e=>message(e.message));$('days').append(b);}
}
function completeUI(){
  const p=state.progress.find(p=>p.day===day);
  $('completion').textContent=p?(p.source==='local-c'?'✓ 本地真实C已通过（已同步）':p.method==='test'?'✓ 在线练习通过':'✓ 自定义通关'):'尚未通关';
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
  const token=/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)(?:[uUfF])?\b|\b[a-zA-Z_]\w*\b|[^\w]/g;
  for(const match of source.matchAll(token)){const t=match[0];let cls='';
    if(t.startsWith('/*')||t.startsWith('//'))cls='syntax-comment';else if(t[0]==='"'||t[0]==="'")cls='syntax-string';else if(/^\d/.test(t))cls='syntax-number';
    else if(/^(if|else|for|return|const|typedef|enum|struct|static|sizeof)$/.test(t))cls='syntax-keyword';else if(/^(int|float|double|void|size_t|uint8_t|uint32_t|unsigned)$/.test(t))cls='syntax-type';else if(/^(scanf|printf|roundf|isfinite|Encode|Decode|main|AnalyzeSpeeds|Acc_Process)$/.test(t))cls='syntax-function';
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
  coloredCode($('code'),lesson.code);
  $('walkthrough').hidden=!lesson.code_sections;$('codeSteps').replaceChildren();
  if(lesson.code_sections){$('remediationText').replaceChildren();paragraphs($('remediationText'),lesson.reading[0].text);if(lesson.protocol)$('remediationText').append(makeTable(lesson.protocol.headers,lesson.protocol.rows));lesson.code_sections.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.title;b.onclick=()=>showStep(i);$('codeSteps').append(b);});showStep(0);}
  $('codeFile').textContent='C17 · '+lesson.source;$('code').classList.remove('expanded');$('expandCode').textContent='展开全部';$('expandCode').setAttribute('aria-expanded','false');
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
  renderCode();$('reading').replaceChildren();
  for(const r of (lesson.code_sections?lesson.reading.slice(1):lesson.reading)){const section=document.createElement('section'),h=document.createElement('h3');h.textContent=r.title;section.append(h);for(const text of r.text.split('\n')){const p=document.createElement('p');p.textContent=text;section.append(p);}if(r.table)section.append(makeTable(r.table.headers,r.table.rows));for(const source of r.sources||[]){const p=document.createElement('p'),a=document.createElement('a');a.textContent=source.title;a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';p.append(a);section.append(p);}$('reading').append(section);}
  renderFields('runFields',lesson.run_fields);renderFields('answerFields',lesson.practice.fields,'answer-');
  steps('labSteps',lesson.lab_steps);steps('testSteps',lesson.test_steps);steps('practiceSteps',lesson.practice.steps);
  $('presets').replaceChildren();for(const e of lesson.experiments){const b=document.createElement('button');b.textContent=e.name;b.onclick=()=>setInputs(e.values,e.hint,e.steps);$('presets').append(b);}
  setInputs(lesson.experiments[0].values,lesson.experiments[0].hint,lesson.experiments[0].steps);drawChecklist(result.experiments);
  $('notes').value=record.notes;$('feedback').value=record.feedback;dirty=false;
  try{const draft=JSON.parse(localStorage.getItem(draftKey(day))||'null');if(draft){$('notes').value=draft.notes;$('feedback').value=draft.feedback;dirty=true;}}catch(e){}
  $('saveStatus').textContent=dirty?'已恢复未保存草稿，请立即保存。':record.updated?'已从电脑读取笔记':'尚无笔记';
  $('passRule').textContent=lesson.pass_rule;$('practiceText').textContent=lesson.practice.text;
  $('questions').replaceChildren();for(const q of lesson.questions){const f=document.createElement('fieldset'),leg=document.createElement('legend');f.className='question';leg.textContent=q.text;f.append(leg);q.options.forEach((o,i)=>{const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');input.type='radio';input.name=q.id;input.value=i;span.textContent=o;label.append(input,span);f.append(label);});$('questions').append(f);}
  $('output').replaceChildren();const empty=document.createElement('p');empty.className='muted';empty.textContent='选一个场景，点击运行。';$('output').append(empty);
  $('engine').textContent='';$('runStatus').textContent='';$('prediction').value='';$('overrideReason').value='';$('result').replaceChildren();$('requestFallback').hidden=true;
  if(record.attempt){const answers=JSON.parse(record.attempt.answers);for(const q of lesson.questions){const value=answers[q.id];const input=$('quiz').querySelector(`input[name="${q.id}"][value="${value}"]`);if(input)input.checked=true;}for(const f of lesson.practice.fields)$('answer-'+f.id).value=answers[f.id]??'';showResult(JSON.parse(record.attempt.result));}
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
    if(lesson.runner==='can_day03'){
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
  $('result').replaceChildren();const h=document.createElement('h3');h.className=result.passed?'pass':'fail';h.textContent=result.passed?'✓ 今日检测通过':'还没有通关：按下面提示补齐，再试一次';$('result').append(h);
  const names={q1:'地址',q2:'状态与输出',q3:'间距计算',q4:'const输入',q5:'无效结果',speed_ms:'迁移速度',desired:'迁移间距',error:'迁移误差',mode:'迁移模式',normal:'正常实验',fault:'故障实验',transfer:'迁移实验'};
  const ul=document.createElement('ul');ul.className='test-checks';for(const c of result.checks){const li=document.createElement('li');li.className=c.passed?'pass':'fail';li.textContent=`${c.passed?'✓':'✗'} ${c.label||names[c.id]||c.id}：${c.passed?'通过':c.message}`;if(!c.passed&&c.values){const b=document.createElement('button');b.type='button';b.textContent='去运行';b.className='small';b.onclick=()=>{setInputs(c.values,`补齐实验：${c.label}；输入已填好，请点击运行案例。`);tab('run');$('runButton').focus();};li.append(document.createTextNode(' '),b);}ul.append(li);}$('result').append(ul);
  const det=document.createElement('details'),sum=document.createElement('summary');sum.textContent=`浏览器模拟回归：${result.tests.filter(t=>t.passed).length}/${result.tests.length}通过`;det.append(sum);
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
$('copyRequest').onclick=async()=>{try{await saveNotes();const status=state.progress.find(p=>p.day===day);const request=`我完成了D${String(day).padStart(2,'0')}的在线练习（${status?.method==='test'?'浏览器练习通过':'尚未检测或自定义通关'}；不是本地真实C通关）。请根据以下笔记检查薄弱项，制作下一课，并更新Pages课程。\n\n我的笔记：\n${$('notes').value.slice(0,8000)}\n\n希望优化：\n${$('feedback').value||'暂未填写'}\n\n保持：完整中文代码、执行链、代码旁解释、详细实作、真实C在本地完成。`;await copy(request,$('requestFallback'));}catch(e){message(e.message);}};
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function exportReport(){await saveNotes();const text=await api('/api/report?day='+day);download(text,`D${String(day).padStart(2,'0')}-在线练习报告.md`,'text/markdown;charset=utf-8');}
for(const id of ['exportReport','reportSide'])$(id).onclick=()=>exportReport().catch(e=>message(e.message));
$('backup').onclick=async()=>{try{await saveNotes();const data=await api('/api/backup');download(JSON.stringify(data,null,2),'智驾学习数据备份.json','application/json');message('全部学习数据已导出。');}catch(e){message(e.message);}};
async function start(){try{state=await api('/api/state');drawRoute();const ready=state.courses.filter(c=>c.unlocked&&c.published);const current=ready.find(c=>!c.completed)||ready[ready.length-1];if(!current)throw Error('尚无已发布课程。');await selectDay(current.day);}catch(e){message('在线课程读取失败：'+e.message+' 请检查网络与站点资源，再刷新。');}}
window.pagesAppReady=start();
