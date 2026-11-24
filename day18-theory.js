'use strict';
(function(){
 const NS='http://www.w3.org/2000/svg',blue='#3979b2',orange='#c47c31',green='#248874',ink='#253d55';
 function add(s,tag,a={},value){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(a))n.setAttribute(k,String(v));if(value!==undefined)n.textContent=value;s.append(n);return n;}
 function create(title,detail){const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 850 365');s.setAttribute('role','img');s.setAttribute('aria-label',title+'；'+detail);add(s,'title',{},title);txt(s,22,28,title,ink,19);txt(s,22,53,detail,'#627487',13);return s;}
 function txt(s,x,y,v,fill=ink,size=14){return add(s,'text',{x,y,fill,'font-size':size,'font-family':'system-ui,Microsoft YaHei,sans-serif'},v);}
 function line(s,x1,y1,x2,y2,stroke='#bacbdd',width=1.4,dash=''){return add(s,'line',{x1,y1,x2,y2,stroke,'stroke-width':width,'stroke-dasharray':dash});}
 function poly(s,data,X,Y,color){add(s,'polyline',{points:data.map((v,i)=>X(i)+','+Y(v)).join(' '),fill:'none',stroke:color,'stroke-width':2.4});}
 function drawPair(a,b,title,ylabel,dt=.1,extra=''){
   const s=create(title,'橙色：输入；蓝色：输出。'+extra);const lo=Math.min(...a,...b),hi=Math.max(...a,...b);
   const min=lo-.08*Math.max(hi-lo,.1),max=hi+.08*Math.max(hi-lo,.1);
   const X=i=>75+i/(a.length-1)*730,Y=v=>310-(v-min)/(max-min)*230;
   for(let i=0;i<=4;i++){const v=min+i*(max-min)/4,p=Y(v);line(s,75,p,805,p,'#e4ebf3');txt(s,15,p+4,v.toFixed(2),'#64748b',12);}
   line(s,75,310,805,310);line(s,75,80,75,310);txt(s,75,72,ylabel,'#64748b',12);
   for(let i=0;i<=4;i++){const k=Math.round(i*(a.length-1)/4);txt(s,X(k)-12,330,(k*dt).toFixed(1),'#64748b',12);}
   txt(s,713,352,'时间（s）','#64748b',12);poly(s,a,X,Y,orange);poly(s,b,X,Y,blue);return s;
 }
 function bars(vals,labels,title,detail,unit){
   const s=create(title,detail),min=Math.min(0,...vals),max=Math.max(0,...vals),span=Math.max(max-min,.1),Y=x=>310-(x-min)/span*220;
   line(s,60,Y(0),810,Y(0));txt(s,25,78,unit,'#64748b',12);
   vals.forEach((v,i)=>{const w=710/vals.length,x=83+i*w;add(s,'rect',{x,y:Math.min(Y(v),Y(0)),width:w*.55,height:Math.max(2,Math.abs(Y(v)-Y(0))),fill:i%2?blue:orange,rx:3});txt(s,x,Y(v)+(v<0?19:-9),Number(v.toFixed(4)).toString(),ink,14);txt(s,x,340,labels[i],ink,12);});return s;
 }
 function visual(kind,alpha){
   const r=day18Calculate(alpha===.1?0:1);
   if(kind==='step'||kind==='recursion')return drawPair(r.step.slice(15,55),r.response.slice(15,55),'无噪声阶跃：α='+alpha,'归一化幅值',.1,'10%–90%上升时间 '+r.rise_s.toFixed(1)+' s；图中时间从截取片段开始。');
   if(kind==='compare')return bars([r.raw_variance,r.filtered_variance],['原始方差','滤后方差'],'同一噪声序列，α='+alpha,'后200点；上升时间 '+r.rise_s.toFixed(1)+' s；方差以各自均值为基准。','(m/s)²');
   if(kind==='seed')return drawPair(r.raw.slice(0,50),r.filtered.slice(0,50),'固定种子18：相同输入，α='+alpha,'速度（m/s）',.1);
   if(kind==='bias'){const b=day18Calculate(4);return bars([r.raw_bias,r.filtered_bias,b.raw_bias,b.filtered_bias],['无偏置原始','无偏置滤后','+0.4原始','+0.4滤后'],'随机波动降低不等于固定偏差消除','前两柱为当前α；后两柱固定α=.1、注入0.4m/s偏差。','平均误差（m/s）');}
   if(kind==='variance')return bars([-1,0,1,1,0,1],['偏差1','偏差2','偏差3','平方1','平方2','平方3'],'[9,10,11]围绕均值10的偏差与平方','偏差相加=0；平方平均=(1+0+1)/3=2/3。前3列m/s，后3列(m/s)²。','数值（单位见说明）');
   if(kind==='error')return bars([-.2,.3,.1,.4],['读数9.8','读数10.3','读数10.1','固定偏差'],'以真实速度10为基准的有符号误差','噪声是波动成分；偏差是整体偏移。','m/s');
   if(kind==='uniform'){const s=create('理想均匀分布U(-1,1)','阴影区间[-0.5,0.5]面积=1×0.5=0.5。');add(s,'rect',{x:120,y:115,width:600,height:175,fill:'#e4edf8',stroke:blue});add(s,'rect',{x:270,y:115,width:300,height:175,fill:'#aacfd1'});line(s,90,290,760,290);line(s,120,85,120,300);for(const [x,v] of [[120,'−1'],[270,'−0.5'],[420,'0'],[570,'0.5'],[720,'1']])txt(s,x-12,315,v);txt(s,65,121,'0.5');txt(s,315,200,'P = 0.5',green,20);txt(s,625,348,'误差（m/s）');return s;}
   return bars([0,0,1,1],['索引0','索引1','索引2','索引3'],'np.flatnonzero：找非零元素的位置','[0,0,1,1] >= 0.9 → [False,False,True,True] → 索引[2,3]。','数组值');
 }
 function makeText(parent,tag,value,cls){
   const x=document.createElement(tag);x.textContent=value;
   if(cls)x.className=cls;parent.append(x);return x;
 }
 function figure(section,kind){
   const fig=document.createElement('figure');fig.className='d17-figure d18-figure';fig.dataset.diagram=kind;
   const canvas=document.createElement('div');canvas.className='d17-figure-canvas';
   let alpha=.1,svg=visual(kind,alpha);canvas.append(svg);fig.append(canvas);
   if(['recursion','step','compare','seed','bias'].includes(kind)){
     const controls=document.createElement('div');controls.className='d17-dt-buttons';
     makeText(controls,'span','切换新测量权重 α：');
     for(const a of [.1,.8]){
       const btn=document.createElement('button');btn.type='button';btn.dataset.alpha=String(a);btn.textContent='α = '+a;btn.setAttribute('aria-pressed',String(a===alpha));
       btn.onclick=()=>{alpha=a;const next=visual(kind,alpha);svg.replaceWith(next);svg=next;controls.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));};
       controls.append(btn);
     }
     fig.append(controls);
   }
   makeText(fig,'figcaption','D18离线教学图。橙色表示输入/参考，蓝色为输出或样本；固定种子比较使用相同输入。图表由浏览器JS计算，不执行Python。');
   section.append(fig);
 }
 function index(target,readings){
   const nav=document.createElement('nav');nav.className='d17-index';
   nav.setAttribute('aria-label','D18概率与低通滤波目录');
   makeText(nav,'h3','先理解噪声，再推导滤波：12步建立统计与估计直觉');
   makeText(nav,'p','先看误差→概率→均值方差→递推→阶跃→API手册→实作；不要只看平滑程度。');
   const links=document.createElement('div');links.className='d17-links';
   readings.forEach((r,i)=>{
     const a=document.createElement('a');a.href='#d18-concept-'+(i+1);
     a.textContent=String(i+1).padStart(2,'0')+' · '+r.title.split('｜').at(-1).slice(0,19);
     links.append(a);
   });
   nav.append(links);target.append(nav);
 }
 function render(section,r,i,jump){
   section.classList.add('d17-concept');section.id='d18-concept-'+(i+1);
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
 window.Day18Theory={index,render,drawPair};
})();