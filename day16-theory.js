'use strict';
// D16专用图解：全部坐标按世界x右/y上、逆时针正角绘制；网页版不执行Python。
(function(){
const NS='http://www.w3.org/2000/svg',blue='#356c9a',orange='#c77b2e',
green='#228b79',purple='#8449a1',red='#b94b57',ink='#27394c';
const E=(name,attrs={},value)=>{
 const n=document.createElementNS(NS,name);
 for(const [key,val] of Object.entries(attrs))n.setAttribute(key,String(val));
 if(value!==undefined)n.textContent=String(value);return n;
};
const put=(svg,name,attrs={},value)=>{const n=E(name,attrs,value);svg.append(n);return n;};
function text(svg,x,y,value,color=ink,size=14,weight='normal'){
 return put(svg,'text',{x,y,fill:color,'font-size':size,'font-weight':weight,
 'font-family':'system-ui,Microsoft YaHei,sans-serif'},value);
}
function line(svg,a,b,color=blue,width=2,dash=''){
 const prop={x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:color,'stroke-width':width};
 if(dash)prop['stroke-dasharray']=dash;return put(svg,'line',prop);
}
function arrow(svg,a,b,color=blue){
 line(svg,a,b,color,3.6);
 const t=Math.atan2(b[1]-a[1],b[0]-a[0]),l=11;
 put(svg,'polygon',{points:[b,[b[0]-l*Math.cos(t-.5),b[1]-l*Math.sin(t-.5)],
  [b[0]-l*Math.cos(t+.5),b[1]-l*Math.sin(t+.5)]].map(p=>p.join(',')).join(' '),fill:color});
}
function dot(svg,p,color=purple){put(svg,'circle',{cx:p[0],cy:p[1],r:6,fill:color,stroke:'#fff','stroke-width':1.3});}
function rect(svg,x,y,w,h,title,sub){
 put(svg,'rect',{x,y,width:w,height:h,rx:10,fill:'#fbfcfe',stroke:'#cdd9e4'});
 text(svg,x+15,y+28,title,ink,17,'700');if(sub)text(svg,x+15,y+50,sub,'#627488',12);
}
function plane(svg,x,y,w,h,limits){
 const [minX,maxX,minY,maxY]=limits,pad={l:35,r:14,t:63,b:29};
 const ox=x+pad.l,oy=y+pad.t,ww=w-pad.l-pad.r,hh=h-pad.t-pad.b;
 const map=(a,b)=>[ox+(a-minX)*ww/(maxX-minX),oy+hh-(b-minY)*hh/(maxY-minY)];
 for(let xx=Math.ceil(minX);xx<=Math.floor(maxX);xx++){
  line(svg,map(xx,minY),map(xx,maxY),'#edf1f7',1);
 }
 for(let yy=Math.ceil(minY);yy<=Math.floor(maxY);yy++){
  line(svg,map(minX,yy),map(maxX,yy),'#edf1f7',1);
 }
 if(minX<=0&&maxX>=0)line(svg,map(0,minY),map(0,maxY),'#99acc0',2);
 if(minY<=0&&maxY>=0)line(svg,map(minX,0),map(maxX,0),'#99acc0',2);
 text(svg,ox+ww-46,oy+hh+23,'x (m)','#526b83',12);
 text(svg,ox+4,oy+12,'y (m)','#526b83',12);return map;
}
function two(labelA,labelB,subA,subB){
 const svg=E('svg',{viewBox:'0 0 880 350',role:'img','aria-label':labelA+'；'+labelB});
 put(svg,'title',{},labelA+'与'+labelB);
 rect(svg,8,10,426,310,labelA,subA);rect(svg,446,10,426,310,labelB,subB);
 return svg;
}
function mark(svg,map,p,label,color=purple){
 const q=map(p[0],p[1]);dot(svg,q,color);
 text(svg,q[0]+9,q[1]-10,label,color,13,'700');
}
function frames(){
 const s=two('车在原点、朝向右方','车向左转90°、位于(10,5)','车前方点(1,0)','同一相对点在世界(10,6)');
 const a=plane(s,8,10,426,310,[-1.8,3,-1.5,2.9]),b=plane(s,446,10,426,310,[7.5,13,2.5,8.1]);
 arrow(s,a(0,0),a(1.6,0),orange);arrow(s,a(0,0),a(0,1.4),green);
 mark(s,a,[1,0],'目标(1,0)');text(s,a(0,0)[0]-14,a(0,0)[1]+21,'车体原点',orange,12);
 arrow(s,b(10,5),b(10,6.7),orange);arrow(s,b(10,5),b(8.6,5),green);
 mark(s,b,[10,6],'目标(10,6)');
 text(s,b(10,5)[0]+9,b(10,5)[1]+21,'车体原点(10,5)',orange,12);
 text(s,17,342,'橙色：车头方向；绿色：车左侧方向；紫色：目标点。',ink,13);return s;
}
function unitCircle(deg){
 const s=E('svg',{viewBox:'0 0 880 350',role:'img','aria-label':'单位圆角度'+deg+'度的箭头及水平竖直投影'});
 put(s,'title',{},'用单位圆理解正弦与余弦');
 rect(s,8,10,864,310,'一根1米长的箭头怎样旋转？','水平投影是cos，竖直投影是sin；下方可以切换角度');
 const origin=[285,178],r=117,rad=deg*Math.PI/180,co=Math.cos(rad),si=Math.sin(rad);
 line(s,[117,178],[448,178],'#9bacbb',2);line(s,[285,309],[285,49],'#9bacbb',2);
 put(s,'circle',{cx:285,cy:178,r,fill:'none',stroke:'#cdd8e4','stroke-width':1.6});
 const p=[285+r*co,178-r*si];
 line(s,[p[0],178],p,green,2.5,'5 5');line(s,[285,p[1]],p,purple,2.5,'5 5');
 arrow(s,origin,p,orange);dot(s,p);text(s,p[0]+9,p[1]-12,'旋转后的点',purple,12);
 const nice=n=>Math.abs(n)<1e-10?'0':n.toFixed(3);
 text(s,517,117,'θ = '+deg+'° = '+rad.toFixed(4)+' rad',ink,19,'700');
 text(s,517,166,'cosθ（水平） = '+nice(co),green,17);
 text(s,517,204,'sinθ（竖直） = '+nice(si),purple,17);
 text(s,517,252,'终点 = ('+nice(co)+', '+nice(si)+')',ink,18,'700');
 text(s,517,289,'先从箭头看投影，再读矩阵。','#627488',13);
 text(s,18,343,'同一单位圆，角度变化时，终点和两个投影一起变化。',ink,13);return s;
}
function basis(){
 const s=two('旋转前的两根单位箭头','逆时针旋转90°','第1根(1,0)、第2根(0,1)','旋转后两根箭头成为R的两列');
 const a=plane(s,8,10,426,310,[-1.9,2.4,-1.5,2.7]),b=plane(s,446,10,426,310,[-1.9,2.4,-1.5,2.7]);
 arrow(s,a(0,0),a(1,0),orange);arrow(s,a(0,0),a(0,1),green);
 text(s,a(1,0)[0]+8,a(1,0)[1]-6,'(1,0)',orange,13);
 text(s,a(0,1)[0]+10,a(0,1)[1]-6,'(0,1)',green,13);
 arrow(s,b(0,0),b(0,1),orange);arrow(s,b(0,0),b(-1,0),green);
 text(s,b(0,1)[0]+10,b(0,1)[1]-6,'第1列(0,1)',orange,13);
 text(s,b(-1,0)[0]-67,b(-1,0)[1]-10,'第2列(-1,0)',green,13);
 text(s,15,343,'R90 = [[0, −1], [1, 0]]。右上角的负号对应绿色箭头向左的分量。',ink,13);return s;
}
function translation(){
 const s=E('svg',{viewBox:'0 0 880 350',role:'img','aria-label':'旋转90度之后再加车辆位置10,5的分步图'});
 const titles=['车前1米','原地转90°','移动到(10,5)'];
 const sub=['点(1,0)','旋转后(0,1)','最终世界点(10,6)'];
 const lim=[[-1,2.2,-1,2.3],[-1,2.2,-1,2.3],[7.4,13.2,2.5,8]];
 for(let i=0;i<3;i++)rect(s,8+i*294,10,280,310,titles[i],sub[i]);
 const [a,b,c]=[0,1,2].map(i=>plane(s,8+i*294,10,280,310,lim[i]));
 arrow(s,a(0,0),a(1,0),orange);mark(s,a,[1,0],'(1,0)');
 arrow(s,b(0,0),b(0,1),orange);mark(s,b,[0,1],'(0,1)');
 arrow(s,c(10,5),c(10,6),orange);mark(s,c,[10,6],'(10,6)');
 text(s,c(10,5)[0]+7,c(10,5)[1]+17,'车原点(10,5)',orange,12);
 text(s,18,343,'旋转决定相对方向；平移把车与目标一起放在世界坐标里的实际位置。',ink,13);return s;
}
function homogeneous(){
 const s=E('svg',{viewBox:'0 0 880 350',role:'img','aria-label':'齐次变换矩阵的旋转四格和平移两格以及点与方向差别'});
 put(s,'title',{},'为什么补1会让矩阵包含平移');rect(s,8,10,864,310,'把平移写进3×3矩阵','θ=90°，平移(10,5)，与原来R@p+t得到同一结果');
 const mat=[['0','−1','10'],['1','0','5'],['0','0','1']];
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){
  const x=57+j*94,y=103+i*54;
  put(s,'rect',{x,y,width:94,height:54,fill:i===2?'#e9eff9':j===2?'#fff0e1':'#e0f3ef',stroke:'#b9cad7'});
  text(s,x+36,y+34,mat[i][j],j===2?orange:green,22,'700');
 }
 text(s,57,89,'T_WV',ink,18,'700');
 text(s,57,296,'绿色=旋转；橙色=平移；蓝灰色=辅助行。',ink,13);
 text(s,405,117,'点 [1,0,1]  →  [10,6,1]',purple,19,'700');
 text(s,405,172,'方向 [1,0,0]  →  [0,1,0]',green,18,'700');
 text(s,405,224,'最后一位写1：平移项参与计算。',ink,15);
 text(s,405,258,'最后一位写0：平移项不起作用。',ink,15);
 text(s,405,290,'这里的1不是高度，也不是第3个真实位置轴。','#627488',12);
 return s;
}
function composition(){
 const s=two('先旋转，再平移','先平移，再旋转','A @ R @ p  → (2,1)','R @ A @ p  → (0,3)');
 const a=plane(s,8,10,426,310,[-1,4,-1,4]),b=plane(s,446,10,426,310,[-1,4,-1,4]);
 arrow(s,a(1,0),a(0,1),orange);arrow(s,a(0,1),a(2,1),green);mark(s,a,[2,1],'(2,1)');
 arrow(s,b(1,0),b(3,0),green);arrow(s,b(3,0),b(0,3),orange);mark(s,b,[0,3],'(0,3)');
 text(s,18,343,'同一点按不同顺序旋转、平移，终点不一样。这不是浮点误差。',ink,13);return s;
}
function inverse(){
 const s=E('svg',{viewBox:'0 0 880 350',role:'img','aria-label':'先旋转平移再减平移逆旋转的完整过程'});
 rect(s,8,10,864,310,'逆变换为什么要倒着做？','先把车辆位置减回去，再用R转置恢复相对方向');
 const nodes=[['车体系点','(3,-2)'],['旋转30°','(3.598,-0.232)'],
  ['加平移(10,5)','(13.598,4.768)'],['先减t，再R.T','恢复(3,-2)']];
 nodes.forEach((p,i)=>{
  const x=35+i*210;
  put(s,'rect',{x,y:111,width:172,height:99,rx:9,fill:i===2?'#f6ebfa':'#edf4fa',stroke:'#b8cbdc'});
  text(s,x+12,143,p[0],ink,16,'700');text(s,x+12,183,p[1],i===2?purple:blue,14);
  if(i<3)arrow(s,[x+178,160],[x+204,160],green);
 });
 text(s,52,271,'p_W = R@p_V + t',ink,18,'700');
 text(s,455,271,'p_V = R.T@(p_W − t)',ink,18,'700');
 text(s,52,305,'逆向必须先撤销平移，随后再反向旋转。',ink,14);return s;
}
function batch(){
 const s=two('车体系中的五个地标','世界系中的五个地标','输入 shape = (5,2)','R90和t=(10,5)，输出(5,2)');
 const a=plane(s,8,10,426,310,[-2.3,3,-2,3]),b=plane(s,446,10,426,310,[7.5,12.8,2.5,8]);
 const pv=[[0,0],[1,0],[0,1],[2,-1],[-1,2]],
 pw=[[10,5],[10,6],[9,5],[11,7],[8,4]];
 for(let i=0;i<5;i++){mark(s,a,pv[i],'P'+i);mark(s,b,pw[i],'P'+i);}
 text(s,18,343,'每一行是一个点；点的数量不变，坐标数值根据车的朝向与位置改变。',ink,13);return s;
}
function failure(){
 const s=two('正确：90°先转换为弧度','错误：把数字90直接传给cos','结果(0,1)','结果约(-0.448,0.894)');
 const a=plane(s,8,10,426,310,[-1.4,1.7,-1.4,1.7]);
 const b=plane(s,446,10,426,310,[-1.4,1.7,-1.4,1.7]);
 arrow(s,a(0,0),a(0,1),green);mark(s,a,[0,1],'正确点',green);
 const w=[Math.cos(90),Math.sin(90)];
 arrow(s,b(0,0),b(...w),red);mark(s,b,w,'错误点',red);
 arrow(s,b(0,0),b(0,1),green);
 text(s,15,343,'红色结果只用于诊断；单位错误不能发布有效世界坐标。',red,13);return s;
}
function codeMap(){
 const s=E('svg',{viewBox:'0 0 880 350',role:'img','aria-label':'D16源码模块之间的调用与返回关系'});
 rect(s,8,10,864,310,'知道原理后，沿着源码执行链读一遍','把每个文件对应到已理解的数学步骤');
 const list=[['demo.py','选案例与判断有效'],['scenarios.py','给定角度和点'],
 ['geometry2d.py','计算R、T和坐标'],['plot_frames.py','有效才保存PNG']];
 list.forEach((entry,i)=>{
  const x=25+i*215;put(s,'rect',{x,y:113,width:183,height:101,rx:9,
   fill:i===2?'#e4f3ee':'#eef4fa',stroke:'#b9cada'});
  text(s,x+13,150,entry[0],ink,17,'700');text(s,x+13,185,entry[1],'#526b82',12);
  if(i<3)arrow(s,[x+188,160],[x+208,160],blue);
 });
 text(s,40,274,'调用数学函数后，return将数组或状态交回调用方。',ink,15);
 text(s,40,305,'test_geometry.py需单独运行，不会因为执行demo.py就自动测试。','#627488',13);return s;
}
const diagrams={frames,'unit-circle':()=>unitCircle(30),'rotation-basis':basis,
 translation,homogeneous,composition,inverse,batch,failure,'code-map':codeMap};
const caption={
 frames:'橙色表示车头方向，绿色表示车左方向，紫色是目标。注意两个面板的坐标刻度。',
 'unit-circle':'角度改变时，箭头和两个投影会同步变化。手机可横向滑动图示。',
 'rotation-basis':'每根单位箭头旋转后的坐标成为R的一列。右上角的负号来自y轴向左的分量。',
 translation:'围绕原点旋转与移动整个原点是两个不同动作，缺一不可。',
 homogeneous:'右侧平移值要乘点最后一项的1；方向向量用0则不会平移。',
 composition:'两条路线采用相同输入，但操作先后次序不同，最终位置不同。',
 inverse:'正向先旋转后平移；逆向先撤销平移后逆旋转。',
 batch:'每个P编号对应同一个地标，五行数据在两套坐标中一一对应。',
 failure:'单位错误是可计算却不正确的数值；故障输出标记为无效。',
 'code-map':'与其背函数名，不如沿着输入、计算、返回、绘图的顺序理解。'};
const putText=(parent,tag,value,cls)=>{
 const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;
 parent.append(n);return n;
};
function figure(section,kind){
 if(!diagrams[kind])return;
 const wrap=document.createElement('figure');wrap.className='d16-figure';wrap.dataset.diagram=kind;
 const surface=document.createElement('div');surface.className='d16-figure-canvas';
 let current=diagrams[kind]();surface.append(current);wrap.append(surface);
 if(kind==='unit-circle'){
  const buttons=document.createElement('div');buttons.className='d16-angle-buttons';
  putText(buttons,'span','改变角度，观察终点与投影：');
  for(const angle of [0,30,90,180]){
   const btn=document.createElement('button');btn.type='button';btn.textContent=angle+'°';
   btn.dataset.angle=String(angle);btn.setAttribute('aria-pressed',String(angle===30));
   btn.onclick=()=>{
    const next=unitCircle(angle);current.replaceWith(next);current=next;
    for(const b of buttons.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===btn));
   };
   buttons.append(btn);
  }
  wrap.append(buttons);
 }
 putText(wrap,'figcaption',caption[kind]+' 图示使用本课约定的二维教学数据，非实车测量。');
 section.append(wrap);
}
function render(section,reading,index,jump){
 section.classList.add('d16-concept');section.id='d16-concept-'+(index+1);
 putText(section,'span','理解第 '+String(index+1).padStart(2,'0')+' 步','d16-step-number');
 putText(section,'h3',reading.title);
 putText(section,'p',reading.lead,'d16-lead');
 figure(section,reading.diagram);
 for(const paragraph of reading.text.split('\n\n'))putText(section,'p',paragraph,'d16-prose');
 if(reading.formula){
  const wrapper=document.createElement('div');wrapper.className='d16-formula-box';
  putText(wrapper,'h4','把图和计算写成公式');
  putText(wrapper,'pre',reading.formula,'d16-formula');section.append(wrapper);
 }
 if(reading.worked?.length){
  putText(section,'h4','带着数字逐步核对');
  const ol=document.createElement('ol');ol.className='d16-worked';
  for(const step of reading.worked)putText(ol,'li',step);section.append(ol);
 }
 if(reading.check){
  const det=document.createElement('details');det.className='d16-selfcheck';
  putText(det,'summary','先自己想：'+reading.check.question);
  putText(det,'p',reading.check.answer);section.append(det);
 }
 if(Number.isInteger(reading.code_step)){
  const btn=putText(section,'button','我理解了这一节 → 查看对应Python源码','d16-code-jump');
  btn.type='button';btn.onclick=()=>jump(reading.code_step);
 }
 for(const src of reading.sources||[]){
  const p=document.createElement('p');p.className='d16-source';
  const a=document.createElement('a');a.textContent=src.title;a.href=src.url;
  a.target='_blank';a.rel='noopener noreferrer';p.append(a);section.append(p);
 }
}
function index(target,readings){
 const nav=document.createElement('nav');nav.className='d16-chapter-index';
 nav.setAttribute('aria-label','D16理论目录');
 putText(nav,'h3','先学原理，再看代码：14步理解车体与世界坐标');
 putText(nav,'p','点击编号直达对应知识点；每节都有配图、推理、数值演算和自测答案。理论学完后，页面下方才是完整Python工程。');
 const links=document.createElement('div');links.className='d16-chapter-links';
 for(const [i,reading] of readings.entries()){
  const link=document.createElement('a');link.href='#d16-concept-'+(i+1);
  link.textContent=String(i+1).padStart(2,'0')+' · '+reading.title.split('｜').at(-1).slice(0,19);
  links.append(link);
 }
 nav.append(links);target.append(nav);
}
window.Day16Theory={render,index};
})();