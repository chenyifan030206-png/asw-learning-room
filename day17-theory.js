'use strict';
// D17原生SVG数学教学。所有图为离线示例，蓝色代表离散近似，橙色代表真实函数。
(function(){
 const NS='http://www.w3.org/2000/svg',C={navy:'#30495f',blue:'#4376a5',orange:'#c77a31',green:'#228574',red:'#b94b57',pale:'#e7f0f9'};
 const el=(name,props={},content)=>{
   const x=document.createElementNS(NS,name);
   for(const [key,value] of Object.entries(props))x.setAttribute(key,String(value));
   if(content!==undefined)x.textContent=String(content);
   return x;
 };
 const add=(svg,name,props={},value)=>{const x=el(name,props,value);svg.append(x);return x;};
 const text=(s,x,y,value,color=C.navy,size=14)=>add(s,'text',{x,y,fill:color,'font-size':size,'font-family':'system-ui,Microsoft YaHei,sans-serif'},value);
 const line=(s,a,b,color=C.blue,w=2,dash=null)=>{
   const attrs={x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':w};
   if(dash)attrs['stroke-dasharray']=dash;
   add(s,'line',attrs);
 };
 const circle=(s,p,color=C.blue,r=4)=>add(s,'circle',{cx:p[0],cy:p[1],r,fill:color,stroke:'#fff','stroke-width':1});
 const rect=(s,x,y,w,h,color,stroke='#acc3d7')=>add(s,'rect',{x,y,width:w,height:h,fill:color,stroke,'stroke-width':.9});
 const round=n=>Number(n.toFixed(4));
 function create(title,detail){
   const s=el('svg',{viewBox:'0 0 890 380',role:'img','aria-label':title+detail});
   add(s,'title',{},title);
   text(s,25,28,title,C.navy,18);
   text(s,25,53,detail,'#627487',13);
   return s;
 }
 function axes(s,range=[0,2,0,16],box=[75,78,730,275]){
   const [xmin,xmax,ymin,ymax]=range,[x,y,w,h]=box;
   const map=(a,b)=>[x+(a-xmin)/(xmax-xmin)*w,y+h-(b-ymin)/(ymax-ymin)*h];
   for(const t of [0,.5,1,1.5,2]){
     if(t<xmin||t>xmax)continue;
     const p=map(t,0),q=map(t,ymax);
     line(s,p,q,'#e7edf4',1);
     text(s,p[0]-8,y+h+22,String(t),'#64748b',11);
   }
   const tickStart=ymin===0?0:Math.ceil(ymin/2)*2;
   for(let v=tickStart;v<=ymax;v+=ymax===16?4:2){
     const p=map(xmin,v),q=map(xmax,v);
     line(s,p,q,'#e7edf4',1);text(s,x-32,p[1]+4,String(v),'#64748b',11);
   }
   line(s,map(xmin,ymin),map(xmax,ymin),C.navy,2);
   line(s,map(xmin,ymin),map(xmin,ymax),C.navy,2);
   text(s,x+w-26,y+h+40,'时间 t（s）','#64748b',12);
   return map;
 }
 function curve(s,map,mode='linear'){
   let first=null;
   for(let i=0;i<=100;i++){
     const t=2*i/100,v=mode==='constant'?10:10+2*t,p=map(t,v);
     if(first)line(s,first,p,C.orange,2.6);
     first=p;
   }
 }
 function intervalMarks(s,map,dt,mode){
   const n=Math.round(2/dt);
   if(mode==='left'||mode==='compare'||mode==='intervals'||mode==='area'){
     for(let i=0;i<n;i++){
       const t=i*dt,v=mode==='area'?10:10+2*t;
       const p=map(t,v),pNext=map(t+dt,0),baseline=map(t,0);
       rect(s,p[0],p[1],pNext[0]-p[0],baseline[1]-p[1],
         mode==='area'?'#cfe5d9':'#d6e5f5', '#91afce');
     }
   }
   if(mode==='trap'){
     for(let i=0;i<n;i++){
       const t=i*dt,p0=map(t,0),p1=map(t,10+2*t),p2=map(t+dt,10+2*(t+dt)),p3=map(t+dt,0);
       add(s,'polygon',{points:[p0,p1,p2,p3].map(a=>a.join(',')).join(' '),
         fill:'#d7efe5',stroke:'#7bbca3','stroke-width':.6});
     }
   }
   for(let i=0;i<=n;i++){
     const t=i*dt,v=mode==='area'?10:10+2*t;
     circle(s,map(t,v),C.blue,2.4);
   }
 }
 function speedGraph(mode,dt){
   const modeName={
     overview:'为什么记录速度要同时记录时间？',units:'物理单位先对账',
     area:'恒速10m/s：面积就是20米位移',intervals:'采样点与相邻时间区间',
     rectangles:'左端矩形近似速度曲线下面积',compare_dt:'缩短dt后矩形更贴近曲线',
     trapezoid:'用相邻两端速度画出梯形',
     slope:'速度每0.1秒增加0.2m/s：斜率是2m/s²',
     continuity:'位置、速度和加速度的关系',numpy:'NumPy在计算每个区间',irregular:'dt必须来自实际时间戳'
   };
   const s=create(modeName[mode]||'速度—时间图','橙线是连续数学模型；蓝点是采样值。横轴秒、纵轴米/秒。');
   const map=axes(s);
   if(['area','intervals','rectangles','compare_dt','trapezoid'].includes(mode))
     intervalMarks(s,map,dt,mode==='rectangles'?'left':mode==='compare_dt'?'compare':mode==='trapezoid'?'trap':mode);
   curve(s,map,mode==='area'?'constant':'linear');
   if(mode==='slope'){
     const p=map(.3,10.6),q=map(.4,10.8);
     line(s,[q[0],p[1]],q,C.green,2,'5 3');
     line(s,p,[q[0],p[1]],C.blue,2,'5 3');
     circle(s,p,C.orange,5);circle(s,q,C.orange,5);
     text(s,510,138,'Δv = 0.2 m/s',C.green,15);
     text(s,510,161,'Δt = 0.1 s',C.blue,15);
     text(s,510,184,'a = Δv/Δt = 2 m/s²',C.navy,15);
   }
   if(mode==='irregular'){
     for(const t of [0,.1,.25,.35]){
       const v=10+2*t,p=map(t,v);
       circle(s,p,C.blue,6);
       line(s,p,map(t,0),C.green,1.4,'4 4');
     }
     text(s,510,149,'时间：0、0.10、0.25、0.35s',C.navy,13);
     text(s,510,175,'间隔：0.10、0.15、0.10s',C.navy,13);
   }
   if(mode==='area')text(s,420,291,'矩形面积：10m/s × 2s = 20m',C.green,15);
   if(mode==='intervals')text(s,420,279,dt===.1?'21个采样点，20个区间':'41个采样点，40个区间',C.navy,15);
   if(mode==='rectangles'||mode==='compare_dt')text(s,420,286,dt===.1?'左矩形：23.8m，误差−0.2m':'左矩形：23.9m，误差−0.1m',C.navy,15);
   if(mode==='trapezoid')text(s,430,285,'本例直线速度：梯形面积 = 24m',C.green,15);
   if(mode==='overview')text(s,418,290,'已知时间轴，才能算每段位移与速度变化率。',C.navy,14);
   if(mode==='units')text(s,414,289,'纵轴 m/s × 横轴 s → 面积 m',C.navy,15);
   if(mode==='continuity')text(s,415,288,'速度是位置的斜率；加速度是速度的斜率。',C.navy,14);
   if(mode==='numpy')text(s,440,286,'np.diff(t)给出每个区间的宽度dt',C.navy,14);
   text(s,75,71,'速度 v（m/s）','#63788b',12);
   return s;
 }
 function noiseGraph(dt){
   const s=create('固定幅度交替速度误差，差分时为何被放大？',
    '这是人为构造的逐采样误差模式，不是所有真实传感器噪声的定律。');
   const map=axes(s,[0,2,9,15]);
   curve(s,map);
   const n=Math.round(2/dt);
   let prev=null;
   for(let i=0;i<=n;i++){
     const t=2*i/n,v=10+2*t+(i%2===0?.1:-.1),p=map(t,v);
     if(prev)line(s,prev,p,C.blue,1.5);
     circle(s,p,C.blue,3.2);prev=p;
   }
   const noise=.2/dt;
   text(s,525,128,'每个样本误差 ±0.1 m/s',C.navy,14);
   text(s,525,152,'相邻误差差值 ±0.2 m/s',C.navy,14);
   text(s,525,176,'加速度差分噪声幅度 '+noise.toFixed(0)+' m/s²',C.red,14);
   text(s,525,201,'分母dt越小，特定误差被放大越多。','#64748b',12);
   return s;
 }
 function flow(){
   const s=create('连续运动和离散程序之间的对应关系','先理解数学公式，才能读懂下面的Python实现。');
   const nodes=[
     ['时间戳t与速度v','单位：s和m/s'],
     ['检查并求dt','np.diff(t)'],
     ['积分求位移','矩形/梯形累加'],
     ['差分求加速度','np.diff(v)/dt'],
     ['保存三张中文图','真实Python + Matplotlib']
   ];
   nodes.forEach((q,i)=>{
     const x=17+i*176;
     add(s,'rect',{x,y:126,width:163,height:99,rx:10,
       fill:i===2?'#e5f3e9':'#eaf1f9',stroke:'#b0c6d7'});
     text(s,x+9,162,q[0],C.navy,13);
     text(s,x+9,195,q[1],'#64748b',11);
     if(i<4){line(s,[x+163,174],[x+174,174],C.blue,2);}
   });
   text(s,35,283,'错误时间戳在检查阶段就停止；不会把非法加速度当成有效结果。',C.red,15);
   return s;
 }
 function visual(kind,dt){
   if(kind==='noise')return noiseGraph(dt);
   if(kind==='flow')return flow();
   return speedGraph(kind,dt);
 }
 function makeText(parent,tag,value,cls){
   const x=document.createElement(tag);x.textContent=value;
   if(cls)x.className=cls;parent.append(x);return x;
 }
 function figure(section,kind){
   const fig=document.createElement('figure');fig.className='d17-figure';fig.dataset.diagram=kind;
   const canvas=document.createElement('div');canvas.className='d17-figure-canvas';
   let dt=.1,svg=visual(kind,dt);canvas.append(svg);fig.append(canvas);
   if(['intervals','rectangles','compare_dt','trapezoid','noise'].includes(kind)){
     const controls=document.createElement('div');controls.className='d17-dt-buttons';
     makeText(controls,'span','切换采样间隔（真实时长均为2s）：');
     for(const delta of [.1,.05]){
       const btn=document.createElement('button');btn.type='button';
       btn.dataset.dt=String(delta);btn.textContent='dt = '+delta+' s';
       btn.setAttribute('aria-pressed',String(delta===dt));
       btn.onclick=()=>{
         dt=delta;const next=visual(kind,dt);svg.replaceWith(next);svg=next;
         controls.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));
       };
       controls.append(btn);
     }
     fig.append(controls);
   }
   makeText(fig,'figcaption','图示采用D17指定的离线速度和时间。橙线代表理论函数，蓝色表示样本或数值近似；图片是浏览器SVG教学演算，不是本地Python绘图。');
   section.append(fig);
 }
 function index(target,readings){
   const nav=document.createElement('nav');nav.className='d17-index';
   nav.setAttribute('aria-label','D17微积分理论目录');
   makeText(nav,'h3','先从速度图理解，再到NumPy：14步建立积分和差分直觉');
   makeText(nav,'p','建议按顺序学：面积→采样间隔→矩形/梯形→斜率→噪声→时间戳→代码。每一节都配图、公式、逐步手算和参考解释。');
   const links=document.createElement('div');links.className='d17-links';
   readings.forEach((r,i)=>{
     const a=document.createElement('a');a.href='#d17-concept-'+(i+1);
     a.textContent=String(i+1).padStart(2,'0')+' · '+r.title.split('｜').at(-1).slice(0,19);
     links.append(a);
   });
   nav.append(links);target.append(nav);
 }
 function render(section,r,i,jump){
   section.classList.add('d17-concept');section.id='d17-concept-'+(i+1);
   makeText(section,'span','理解第 '+String(i+1).padStart(2,'0')+' 步','d17-step');
   makeText(section,'h3',r.title);
   makeText(section,'p',r.lead,'d17-lead');
   figure(section,r.diagram);
   for(const paragraph of r.text.split('\n\n'))makeText(section,'p',paragraph,'d17-prose');
   const form=document.createElement('div');form.className='d17-formula';
   makeText(form,'h4','把图里的关系写成公式');
   makeText(form,'pre',r.formula);section.append(form);
   makeText(section,'h4','按具体数字走一遍');
   const list=document.createElement('ol');list.className='d17-worked';
   for(const step of r.worked)makeText(list,'li',step);
   section.append(list);
   const details=document.createElement('details');details.className='d17-check';
   makeText(details,'summary','自己先回答：'+r.check.question);
   makeText(details,'p',r.check.answer);section.append(details);
   if(Number.isInteger(r.code_step)){
     const button=makeText(section,'button','对应看真实Python源码 →','d17-code-jump');
     button.type='button';button.onclick=()=>jump(r.code_step);
   }
 }
 window.Day17Theory={index,render};
})();