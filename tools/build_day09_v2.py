"""Build only Day09 metadata from reviewed design; never read personal records."""
from pathlib import Path
import json,re,hashlib
ROOT=Path(__file__).resolve().parent.parent
def load(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def write(p,x):(ROOT/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def build():
    bundle=load('courses.json');old=load('tools/day09-v1.json');lesson=json.loads(json.dumps(old))
    doc=(ROOT/'docs/day09-v2/01_DAY09_LESSON.md').read_text(encoding='utf-8')
    files={p.name:p.read_text(encoding='utf-8') for p in sorted((ROOT/'examples/day09').iterdir()) if p.is_file()}
    def line(file,anchor):
        hits=[i+1 for i,l in enumerate(files[file].splitlines()) if anchor in l and (anchor!='struct Timeline' or l.strip()==anchor)]
        assert len(hits)==1,(file,anchor,hits)
        return hits[0]
    def target(file,anchor,kind='定义'):return dict(file=file,line=line(file,anchor),expected=files[file].splitlines()[line(file,anchor)-1],kind=kind)
    anchors=[('S01','demo.c','    float speed_mps','    // 定义真实输出对象'),('S02','demo.c','    struct Timeline result','    printf("status='),('S03','timing.c','    if (out == NULL)','    // tick=0'),('S04','timing.c','    for (int tick','        // 独立的传感更新'),('S05','timing.c','        // 独立的传感更新','        // 被选中的那轮'),('S06','timing.c','        if (tick == skip_tick)','        int now_ms'),('S07','timing.c','        int now_ms','        if (index > 0)'),('S08','timing.c','            int elapsed_ms','        // 只有本轮控制'),('S09','timing.c','        last_control_ms = now_ms','    // 将整个草稿'),('S10','timing.c','    *out = draft','    return 0;'),('S11','demo.c','    printf("status=','    printf("dt_ms=')]
    steps=[]
    for id,file,start,end in anchors:
        match=re.search(r'### '+id+r'｜([^\n]+)\n(.*?)(?=\n### S|\n## 5\.|\Z)',doc,re.S);assert match,id
        first=line(file,start);last=line(file,end)-(0 if id=='S10' else 1)
        steps.append(dict(id=id,title=match[1],file=file,start_line=first,end_line=last,focus_line=first,expected=files[file].splitlines()[first-1],markdown=match[2].strip(),origin_symbol={'S01':'speed_mps','S02':'result','S03':'draft','S04':'tick','S05':'perception_ms','S06':'last_control_ms','S07':'index','S08':'dt_s','S09':'last_control_ms','S10':'out','S11':'result.control_count'}[id]))
    specs=[
      ('struct Timeline','timing.h','struct Timeline','类型','timing.h 文件作用域','规定对象有哪些成员','result和draft共享类型，不共享变量','改成员布局时所有使用文件都要重新编译','demo.c','struct Timeline result'),
      ('control_ms','timing.h','int control_ms[7]','int[7]成员','struct Timeline','记录有效控制时刻','漏30ms时第3号格为40','容量7不是已填写数量','timing.c','draft.control_ms[index]'),
      ('dt_ms','timing.h','int dt_ms[7]','int[7]成员','struct Timeline','保存相邻有效更新的差','漏30ms时第3号格为20ms','不能把tick当数组下标','timing.c','draft.dt_ms[index]'),
      ('perception_ms','timing.h','int perception_ms[4]','int[4]成员','struct Timeline','独立传感事件时刻','0/20/40/60ms','continue前已处理传感事件','timing.c','draft.perception_ms[draft.perception_count]'),
      ('control_count','timing.h','int control_count;','int成员','struct Timeline','已保存到场条数，含0ms','最终6行，对应5段积分','不是计划轮次数','timing.c','++draft.control_count'),
      ('result','demo.c','struct Timeline result','结构体对象','main局部变量','接收函数输出','成功前为0；写回后count=6','不能把它当函数或指针','demo.c','int status = Timeline_Run'),
      ('Timeline_Run','timing.c','int Timeline_Run(','函数','timing.c定义；timing.h声明','接收三项输入和可写对象地址','本例实参10、3、0、&result','声明不等于函数体','demo.c','int status = Timeline_Run'),
      ('out','timing.c','    struct Timeline *out)','结构体指针','Timeline_Run形参','指向main中的result','保存的是地址，不是另一份结果对象','*out=draft才把结果写入调用者','timing.c','    *out = draft;'),
      ('draft','timing.c','struct Timeline draft','局部结构体对象','Timeline_Run局部变量','先计算完整结果再交付','tick4后count=4、实际累计0.4m','不是指针；成功前result仍未写回','timing.c','    *out = draft;'),
      ('draft.control_count','timing.h','int control_count;','draft对象的int成员','Timeline_Run中的draft','提供下一条写入下标','tick4之前3，之后4','与result.control_count不是同一个变量','timing.c','int index = draft.control_count;'),
      ('result.control_count','timing.h','int control_count;','result对象的int成员','demo.c main中的result','限制输出循环只读已填项','成功返回后6','值经*out=draft复制获得','demo.c','i < result.control_count'),
      ('last_control_ms','timing.c','int last_control_ms =','int局部变量','Timeline_Run','记录上次实际控制时刻','tick3前后都是20ms','先更新再相减会错误得到0','timing.c','last_control_ms = now_ms;'),
      ('tick','timing.c','for (int tick =','int循环变量','for循环','计划序号0到6','漏30ms仍经历tick3','不是CPU时钟','timing.c','int scheduled_ms = tick * 10;'),
      ('scheduled_ms','timing.c','int scheduled_ms =','int局部变量','循环体','计划时刻=tick×10','tick4时40ms','计划时刻不一定等于迟到后的实际时刻','timing.c','int now_ms = scheduled_ms;'),
      ('now_ms','timing.c','int now_ms =','int局部变量','循环体','本轮实际记录时刻','迟到5ms时tick3为35ms','跳过的轮次不创建这个本轮对象','timing.c','int elapsed_ms = now_ms'),
      ('index','timing.c','int index =','int局部变量','循环体','本次真正写数组的下标','漏30ms时tick4对应index3','不要与tick混淆','timing.c','draft.control_ms[index]'),
      ('elapsed_ms','timing.c','int elapsed_ms =','int局部变量','if(index>0)内','本次减上次的毫秒差','40-20=20ms','0ms初始化没有上一段','timing.c','float dt_s ='),
      ('dt_s','timing.c','float dt_s =','float局部变量','if(index>0)内','把毫秒转为秒','20/1000.0=0.020s','写整数除法可能截断成0','timing.c','draft.measured_distance_m +='),
      ('speed_mps','demo.c','float speed_mps =','float输入','main','车速，单位m/s','10m/s，不是10km/h','本模型恒速，不能保证真实变速积分精确','demo.c','int status = Timeline_Run')]
    symbols=[]
    for name,file,anchor,type,scope,why,value,impact,usefile,use in specs:
        # result has two output loops: select the first explicitly at build time, never guess at runtime.
        if name=='result.control_count':use='for (int i = 0; i < result.control_count; ++i)';hits=[i+1 for i,l in enumerate(files[usefile].splitlines()) if use in l];use_target=dict(file=usefile,line=hits[0],expected=files[usefile].splitlines()[hits[0]-1],kind='使用')
        else:use_target=target(usefile,use,'调用' if name=='Timeline_Run' else '使用')
        symbols.append(dict(name=name,type=type,scope=scope,why=why,value=value,impact=impact,definition=target(file,anchor),use=use_target))
    lesson.update(ui='day09-v2',revision='2026-10-26-v2',title='控制更新漏掉一次后，为什么不能总按10ms算距离？',summary='恒速10m/s；漏30ms后，40ms这次应使用20ms。先理解时刻差，再追踪result、out和draft。',time='主课约3小时；D08A补课独立保留，不计入D09通关。',project_intro=None,appendices=[],reading=[],flow_text='main输入 → result → &result → Timeline_Run的out → draft逐轮计算 → *out=draft → 返回main读取result',code_sections=steps)
    lesson['run_fields']=[dict(id='speed_mps',label='速度（m/s）',kind='text',value=10),dict(id='skip_tick',label='跳过轮次（-1不跳过，1—5）',kind='number',value=3),dict(id='late_ms',label='30ms迟到（ms，0—9）',kind='number',value=0)]
    cases=[('正常',[10,-1,0]),('漏30ms',[10,3,0]),('迟到5ms',[10,-1,5]),('非法速度',[-1,-1,0])]
    lesson['experiments']=[dict(id=f'E{i:02}',name=f'E{i:02} · {name}',values=v,hint='先预测dt及距离，运行后再解释。',steps=['先预测，不展示预设答案。','运行浏览器模拟。','选中tick3与tick4，解释last为什么保持20ms。']) for i,(name,v) in enumerate(cases,1)]
    lesson['practice']=dict(text='独立迁移：20m/s，漏30ms，迟到0ms。先写出40ms那轮dt、两种总距离与有效积分段数；提交后再反馈。',values=[20,3,0],fields=[dict(id=k,label=l,kind='number') for k,l in [('gap_ms','40ms这轮dt（ms）'),('fixed','固定dt累计（m）'),('measured','实际dt累计（m）'),('segments','积分段数')]],steps=['先独立手算；不要只重复预设按钮。','写一句原因，留给后续教学审阅。'])
    qs=[('draft首次在哪里创建？',['timing.c的Timeline_Run内，结构体对象','timing.h里的指针','demo.c的main里']),('control_count最初是什么？',['单独全局变量','timing.h中Timeline的int成员','函数名']),('result和draft的同名成员属于谁？',['同一个全局对象','同一个指针','两个不同对象各自的成员']),('&result传给out后，*out=draft修改谁？',['main中的result','只修改out指针的地址值','只延长draft生命期']),('漏tick3时continue之后哪些不更新？',['tick永不增加','last/control_count及控制数组不更新','整个函数已经结束']),('tick4为什么得到20ms？',['40-20，减上次有效控制时刻','4乘5直接规定','因为数组下标4']),('漏30ms时control_count=6，积分段数？',['6','7','5，0ms只初始化']),('迟到5ms、没有漏次，邻段dt是什么？',['10/10ms','15/5ms','20/0ms']),('0.60m可以证明漏控制仍安全吗？',['不能；仅为恒速积分模型','可以证明实车安全','可以证明CPU实时调度精度']),('Timeline_Run声明、定义、调用分别在哪？',['timing.h / timing.c / demo.c','demo.c / timing.h / timing.c','CMake / test / math.h'])]
    lesson['practice']['fields'].insert(0,dict(id='dt_sequence',label='实际dt序列（ms，以逗号分隔，含0ms初始化）',kind='text'))
    lesson['questions']=[dict(id=f'q{i}',text=t,options=o) for i,(t,o) in enumerate(qs,1)]
    correct=[0,1,2,0,1,0,2,1,0,0];jump=['S03','S02','S10','S10','S06','S08','S11','S08','S08','S02']
    rules=dict(correct={f'q{i}':n for i,n in enumerate(correct,1)},numeric={'gap_ms':[20,'40-20=20ms。'],'fixed':[1.0,'20×0.010×5=1.0m。'],'measured':[1.2,'20×0.060=1.2m。'],'segments':[5,'六行到场减去初始化一行。']},labels={f'q{i}':f'第{i}题' for i in range(1,11)},explanations={f'q{i}':qs[i-1][1][correct[i-1]] for i in range(1,11)},needed=[[e['values'],e['id'],e['name']] for e in lesson['experiments']],review_steps={f'q{i}':s for i,s in enumerate(jump,1)})
    rules['labels'].update({k:k for k in rules['numeric']});rules['review_steps'].update({k:'S08' for k in rules['numeric']})
    rules['sequence']={'dt_sequence':[0,10,10,20,10,10]}
    lesson['pass_rule']='四个必做场景、来源与指针链检测、独立20m/s迁移全部通过。旧成绩保留；浏览器通过不代表实际GCC或生产能力通过。'
    lesson['assets']=[dict(name=name,language='cmake' if name=='CMakeLists.txt' else 'c' if name.endswith(('.c','.h')) else 'text',group='appendix' if name in ['signal.h','signal.c','demo_signal.c','test_signal.c'] else 'main',text=text) for name,text in files.items()]
    lesson['code']='\n'.join(files[n] for n in ['demo.c','timing.h','timing.c']);lesson['review_provenance']='根据PR #1的三份已审阅设计文档实现；等待ChatGPT及学员审核，未发布main。'
    lesson['goals']=['从main追踪函数调用、输出地址与写回。','漏30ms后，逐轮算清last、下标和20ms。','区分恒速积分示例与真实控制安全。']
    lesson['lab_steps']=['四个主课场景：正常、漏30ms、迟到5ms、非法速度。','先预测，再运行浏览器模拟，逐轮检查tick3和tick4。','D08A补课独立保存，不计主课通关。']
    lesson['test_steps']=['回答变量来源、指针写回和dt问题。','独立完成20m/s迁移题。','错题可回到对应执行步骤。']
    lesson['architecture']={'headers':['文件','作用','调用关系'],'rows':[['demo.c','读取三项输入，定义result，检查status并输出','main调用Timeline_Run'],['timing.h','声明函数，规定结构体成员','由demo.c和timing.c包含'],['timing.c','校验后在draft中计算，成功时写回','*out=draft修改main中的result']]}
    lesson['v2']=dict(declaration_line=line('timing.h','int Timeline_Run('),symbols=symbols,sections=[dict(title=m[1],markdown=m[2].strip()) for m in re.finditer(r'^## (\d+\.[^\n]*)\n(.*?)(?=^## |\Z)',doc,re.M|re.S)],source_hashes={n:hashlib.sha256(t.encode()).hexdigest() for n,t in files.items()},legacy=old,d08a=old['experiments'][7:])
    bundle['lessons']['9']=lesson;bundle['rules']['9']=rules;write('courses.json',bundle)
def release():
    data=load('courses.json');data.pop('release',None)
    names=['app.js','pages-runtime.js','cloud-sync.js','style.css','day09-v2.js','day09-v2.css','day09-model.js','vendor/highlight.min.js','vendor/cmake.min.js','vendor/highlight.css']
    h=hashlib.sha256(json.dumps(data,ensure_ascii=False,sort_keys=True).encode()+b''.join((ROOT/n).read_text(encoding='utf-8').encode() for n in names)).hexdigest()[:12];data['release']=h;write('courses.json',data)
    p=ROOT/'index.html';html=p.read_text(encoding='utf-8');html=re.sub(r'data-course-version="[^"]+"',f'data-course-version="{h}"',html);html=re.sub(r'(\./[^"?]+\.(?:js|css))(?:\?v=[^"]+)?',lambda m:m[1]+'?v='+h,html);p.write_text(html,encoding='utf-8')
if __name__=='__main__':
    import sys
    if '--release-only' not in sys.argv:build()
    if '--content-only' not in sys.argv:release()
