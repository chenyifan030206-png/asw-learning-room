'use strict';
// Pages没有服务端：这里的接口全在浏览器执行，绝不声称是C编译结果。
const pagesBase = new URL('.', location.href);
const pagesStorageKey = 'asw-pages-v1:' + pagesBase.pathname;
const pagesReady = fetch(new URL('courses.json', pagesBase)).then(async r=>{
  if(!r.ok)throw Error('课程资源读取失败，请检查Pages发布目录。');
  return r.json();
});
function pagesLoad(){
  const value=localStorage.getItem(pagesStorageKey);
  return value?JSON.parse(value):{notes:[],progress:[],runs:[],attempts:[]};
}
function pagesStore(db){
  for(const table of ['runs','attempts'])for(const row of db[table])if(!row.sync_id)row.sync_id=crypto.randomUUID();
  localStorage.setItem(pagesStorageKey,JSON.stringify(db));window.dispatchEvent(new Event('asw-records-changed'));
}
function pagesNow(){return new Date().toISOString();}
function pagesState(bundle,db){
  let frontier=1;while(db.progress.some(p=>p.day===frontier)&&frontier<=84)frontier++;
  return {app:'asw-pages-learning-v1',token:'browser-only',frontier:Math.min(frontier,84),all_complete:frontier>84,progress:db.progress,
    courses:bundle.curriculum.map(c=>({day:c.day,title:c['主题'],week:c.week,stage:c.stage,published:!!bundle.lessons[c.day],unlocked:c.day<=frontier,completed:db.progress.some(p=>p.day===c.day),method:db.progress.find(p=>p.day===c.day)?.method}))};
}
function pagesAccess(day,bundle,db){
  if(!Number.isInteger(day)||day<1||day>84)throw Error('学习日无效。');
  if(!pagesState(bundle,db).courses[day-1].unlocked)throw Error('先通过前一天的在线练习，或使用自定义通关。');
  if(!bundle.lessons[day])throw Error('下一课尚未发布，请完成反馈后继续制作。');
}
function pagesSame(a,b){return a.length===b.length&&a.every((v,i)=>{const x=Number(v),y=Number(b[i]);return x===y||(Number.isNaN(x)&&Number.isNaN(y));});}
function pagesChecklist(day,bundle,db){return bundle.rules[day].needed.map(([values,id,label])=>({values,id,label,passed:db.runs.some(r=>r.day===day&&pagesSame(JSON.parse(r.inputs),values)),message:`还未运行${label}；点击“去运行”填好参数，再点运行案例。`}));}
function pagesNumbers(values,count){
  if(!Array.isArray(values)||values.length!==count)throw Error('请完整填写所有参数。');
  return values.map(v=>{
    const text=String(v).trim();
    if(text.length>32||!/^[-+]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?|nan|inf(?:inity)?)$/i.test(text))throw Error('输入应为完整数字，或nan/inf。');
    return /^[+-]?inf/i.test(text)?(text[0]==='-'?-Infinity:Infinity):Number(text);
  });
}
function pagesSimulate(day,values){
  const f=Math.fround;let result;
  if(day===1){
    const [v,d,s,g]=pagesNumbers(values,4).map(f);
    const valid=[v,d,s,g].every(Number.isFinite)&&v>=0&&v<=250&&d>=0&&d<=500&&s>=0&&s<=50&&g>0&&g<=5;
    result={status:valid?0:-2,valid:Number(valid),mode:2};
    if(valid){const speed_ms=f(v/f(3.6)),desired=f(s+f(g*speed_ms)),error=f(d-desired);Object.assign(result,{speed_ms,desired,error,mode:error>=0?0:1});}
  }else if(day===2){
    const v=pagesNumbers(values,7),count=v[5],pointer=v[6];
    if(!v.every(Number.isFinite)||v.slice(0,5).some(n=>n<0||n>250))throw Error('D02车速须为0—250的有限数字。');
    if(!Number.isInteger(count)||count< -10||count>100||![0,1].includes(pointer))throw Error('数量须为-10到100的整数；地址选择0或1。');
    const status=count<0||count>5?-2:count>0&&pointer===1?-1:0;
    result={capacity:5,array_bytes:20,element_bytes:4,status,valid:Number(status===0)};
    // 4/20/8在此处只是模拟原64位GCC环境，不能测浏览器里的C对象大小。
    if(count>=0)result.pointer_bytes=8;
    if(status===0){const visited=v.slice(0,count).map(f);let sum=0;for(const n of visited)sum=f(sum+n);Object.assign(result,{count,has_data:Number(count>0),sum,visited});if(count>0)result.average=f(sum/count);}
  }else if(day===3){
    const v=pagesNumbers(values,5);const speed=f(v[0]),[mode,radar,length,damage]=v.slice(1);
    if(!v.slice(1).every(n=>Number.isInteger(n)&&n>=-100&&n<=100)||![0,1].includes(damage))throw Error('模式、雷达、长度、损坏开关必须为范围内整数。');
    const status=length!==8?-1:!Number.isFinite(speed)||speed<0||speed>250||mode<0||mode>2||radar<0||radar>1?-2:0;
    result={status,valid:Number(status===0),stage:1};
    if(status===0){const raw=Math.round(f(speed*10)),frame=[raw&255,(raw>>>8)&255,mode|(radar<<2),0,0,0,0,0],received_control=damage===1?frame[2]|3:frame[2];const decode_status=(received_control&3)>2?-2:0;Object.assign(result,{raw,frame,received_control,decode_status,decode_valid:Number(decode_status===0)});if(decode_status===0)result.decoded_speed=Number(f(raw*f(0.1)).toFixed(1));}
  }else throw Error('在线模拟模块尚未发布。');
  result.stdout='浏览器模拟结果（不是C程序stdout）\n'+Object.entries(result).map(([k,v])=>`${k}=${Array.isArray(v)?v.join(','):v}`).join('\n');
  result.engine='在线版 · JavaScript浏览器模拟；没有编译或执行C';return result;
}
function pagesRegression(day){
  const cases={
    1:[['正常',[72,45,10,1.4],{status:0,mode:0,desired:38,error:7}],['间距',[72,35,10,1.4],{mode:1,error:-3}],['边界',[72,38,10,1.4],{mode:0,error:0}],['拒绝负距离',[72,-1,10,1.4],{status:-2,valid:0}],['拒绝NaN',['nan',45,10,1.4],{status:-2,valid:0}],['迁移',[90,40,10,1.4],{desired:45,error:-5,mode:1}]],
    2:[['全部',[72,73,75,74,70,5,0],{sum:364,average:72.8}],['部分',[72,73,75,74,70,3,0],{sum:220,count:3}],['空片段',[72,73,75,74,70,0,0],{valid:1,has_data:0}],['超容量',[72,73,75,74,70,6,0],{status:-2}],['负数量',[72,73,75,74,70,-1,0],{status:-2}],['NULL',[72,73,75,74,70,3,1],{status:-1}],['迁移',[10,20,30,40,50,3,0],{sum:60,average:20}]],
    3:[['独立标准字节',[72.5,1,1,8,0],{raw:725,frame:[213,2,5,0,0,0,0,0]}],['零值',[0,0,0,8,0],{frame:[0,0,0,0,0,0,0,0]}],['上限',[250,2,1,8,0],{raw:2500,frame:[196,9,6,0,0,0,0,0]}],['迁移',[54.3,2,1,8,0],{raw:543,frame:[31,2,6,0,0,0,0,0]}],['量化',[72.24,1,0,8,0],{raw:722,decoded_speed:72.2}],['短帧',[72.5,1,1,2,0],{status:-1}],['负车速',[-1,1,1,8,0],{status:-2}],['NaN',['nan',1,1,8,0],{status:-2}],['接收损坏',[72.5,1,1,8,1],{status:0,decode_status:-2,decode_valid:0}]]};
  return cases[day].map(([name,input,expected])=>{const actual=pagesSimulate(day,input),passed=Object.entries(expected).every(([k,v])=>Array.isArray(v)?JSON.stringify(actual[k])===JSON.stringify(v):Math.abs(actual[k]-v)<0.001);return {name:'浏览器模拟 · '+name,passed,expected,actual};});
}
function pagesReport(day,bundle,db){
  const note=db.notes.find(n=>n.day===day),progress=db.progress.find(p=>p.day===day),attempt=db.attempts.filter(a=>a.day===day).at(-1);
  return `# D${String(day).padStart(2,'0')} 在线练习报告\n\n当前实验是浏览器模拟。恢复的原本地真实C成绩保留来源标记，不把新在线模拟当成真实C检测。\n课程：${bundle.lessons[day].title}\n完成方式：${progress?.source==='local-c'?'本地真实C已通过（从原记录恢复）':progress?.method==='test'?'在线练习通过':progress?'自定义通关':'未完成'}\n\n## 我的笔记\n${note?.notes||''}\n\n## 希望优化\n${note?.feedback||''}\n\n## 最近检测\n${attempt?.result||'未提交'}\n\n## 运行记录\n${JSON.stringify(db.runs.filter(r=>r.day===day).slice(-12),null,2)}\n`;
}
window.pagesAPI=async function(url,obj){
  const bundle=await pagesReady,db=pagesLoad(),route=new URL(url,'https://local.invalid'),day=obj?.day??Number(route.searchParams.get('day'));
  if(route.pathname==='/api/state')return pagesState(bundle,db);
  if(route.pathname==='/api/backup')return {schema:1,kind:'asw-pages-browser-only',created:pagesNow(),data:db};
  pagesAccess(day,bundle,db);
  const lesson=bundle.lessons[day];
  if(route.pathname==='/api/lesson')return {lesson,record:{...(db.notes.find(n=>n.day===day)||{notes:'',feedback:'',updated:null}),attempt:db.attempts.filter(a=>a.day===day).at(-1)||null,runs:db.runs.filter(r=>r.day===day).slice(-12).reverse()},experiments:pagesChecklist(day,bundle,db)};
  if(route.pathname==='/api/checklist')return {experiments:pagesChecklist(day,bundle,db)};
  if(route.pathname==='/api/report')return pagesReport(day,bundle,db);
  const updated=pagesNow();
  if(route.pathname==='/api/notes'){
    if(typeof obj.notes!=='string'||typeof obj.feedback!=='string'||obj.notes.length+obj.feedback.length>100000)throw Error('笔记格式或长度不正确。');
    const previous=db.notes.find(n=>n.day===day);
    const history=[...(previous?.history||[])];
    if(previous&&(previous.notes!==obj.notes||previous.feedback!==obj.feedback))history.push({day,notes:previous.notes,feedback:previous.feedback,updated:previous.updated||'',source:previous.source||'browser'});
    db.notes=db.notes.filter(n=>n.day!==day);db.notes.push({day,notes:obj.notes,feedback:obj.feedback,updated,source:'browser',history});pagesStore(db);return {saved:true,updated};
  }
  if(route.pathname==='/api/run'){const output=pagesSimulate(day,obj.values);db.runs.push({id:db.runs.length+1,day,inputs:JSON.stringify(obj.values),output:JSON.stringify(output),created:updated});pagesStore(db);return output;}
  if(route.pathname==='/api/grade'){
    const rule=bundle.rules[day],answers=obj.answers,checks=[];
    for(const [id,expected] of Object.entries(rule.correct)){const passed=answers[id]===expected;checks.push({id,label:rule.labels[id],passed,message:passed?'回答正确。':rule.explanations[id]});}
    for(const [id,[expected,text]] of Object.entries(rule.numeric)){const value=String(answers[id]??'').trim(),n=Number(value),passed=value!==''&&Number.isFinite(n)&&Math.abs(n-expected)<=0.01;checks.push({id,label:rule.labels[id],passed,message:passed?'计算正确。':text});}
    if(day===1)checks.push({id:'mode',label:'模式判断',passed:answers.mode==='SPACING',message:'误差-5<0，所以选择SPACING间距模式。'});
    checks.push(...pagesChecklist(day,bundle,db));const tests=pagesRegression(day),passed=checks.every(c=>c.passed)&&tests.every(t=>t.passed),result={passed,checks,tests,updated,kind:'browser-practice'};
    db.attempts.push({id:db.attempts.length+1,day,answers:JSON.stringify(answers),result:JSON.stringify(result),created:updated});
    if(passed&&!db.progress.some(p=>p.day===day&&p.method==='test'&&p.source==='local-c')){db.progress=db.progress.filter(p=>p.day!==day);db.progress.push({day,method:'test',detail:'在线前端练习通过，不是本地服务端通关',updated});}pagesStore(db);return result;
  }
  if(route.pathname==='/api/override'){
    const reason=String(obj.reason||'').trim();if(!reason||reason.length>2000)throw Error('请填写自定义通关原因。');
    if(!db.progress.some(p=>p.day===day&&p.method==='test')){db.progress=db.progress.filter(p=>p.day!==day);db.progress.push({day,method:'manual',detail:reason,updated});pagesStore(db);}return {passed:true,method:'manual'};
  }
  throw Error('在线版不支持这个操作。');
};
