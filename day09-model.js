/* Pure deterministic teaching model; no clock, compiler, vehicle or OS scheduler. */
(function(root){
  'use strict';
  function numbers(values,count){
    if(!Array.isArray(values)||values.length!==count)throw Error(`请完整填写${count}项输入。`);
    return values.map(v=>{if(typeof v==='boolean'||!/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|nan|inf(?:inity)?)$/i.test(String(v).trim()))throw Error('请输入完整数字。');return /^[+-]?inf/i.test(String(v))?(String(v)[0]==='-'?-Infinity:Infinity):Number(v);});
  }
  function simulate(values){
    const f=Math.fround,[input,skip,late]=numbers(values,3),speed=f(input);
    const base={status:-2,valid:0,engine:'浏览器 JavaScript 模拟，未执行 C / OS 实时调度'};
    if(!Number.isInteger(skip)||!Number.isInteger(late))throw Error('轮次和迟到毫秒必须为整数。');
    if(!Number.isFinite(speed)||speed<0||speed>50||(skip!==-1&&(skip<1||skip>5))||late<0||late>9)return base;
    let last=0,count=0,fixed=0,measured=0;const control=[],dt=[],sensor=[],trace=[];
    for(let tick=0;tick<=6;tick++){
      const planned=tick*10,before=last,countBefore=count,skipped=tick===skip;
      if(tick%2===0)sensor.push(planned);
      const now=skipped?null:planned+(tick===3?late:0),index=skipped?null:count,gap=skipped?null:count?now-last:0;
      let fixedStep=0,actualStep=0;
      if(!skipped){control.push(now);dt.push(gap);if(count){fixedStep=f(speed*f(0.010));actualStep=f(speed*f(f(gap)/f(1000)));fixed=f(fixed+fixedStep);measured=f(measured+actualStep);}last=now;count++;}
      trace.push({tick,planned_ms:planned,skipped,index,last_before_ms:before,now_ms:now,dt_ms:gap,fixed_step_m:fixedStep,actual_step_m:actualStep,fixed_total_m:fixed,actual_total_m:measured,last_after_ms:last,count_before:countBefore,count_after:count});
    }
    return {...base,status:0,valid:1,speed_mps:speed,control_ms:control,dt_ms:dt,perception_ms:sensor,control_count:count,update_count:count-1,perception_count:sensor.length,fixed_distance_m:Number(fixed.toFixed(6)),measured_distance_m:Number(measured.toFixed(6)),trace};
  }
  function signal(values){
    const [input,now,stamp,valid,source]=numbers(values,5),speed=Math.fround(input);
    if(![now,stamp,valid,source].every(Number.isInteger))throw Error('时刻和标记必须为整数。');
    const status=valid!==1||![1,2].includes(source)||!Number.isFinite(speed)||speed<0||speed>50||now<0||now>1000000||stamp<0||stamp>1000000?-2:stamp>now?-3:now-stamp>100?-4:0;
    return {status,valid:Number(status===0),...(status===0||status===-4?{age_ms:now-stamp}:{}),engine:'D08A 浏览器模拟，未执行 C'};
  }
  function coreInputs(values){return Array.isArray(values)&&values.length===8&&Number(values[7])===0?values.slice(0,3):values;}
  function appendixInputs(values){return Array.isArray(values)&&values.length===8&&Number(values[7])===1?[values[0],...values.slice(3,7)]:null;}
  root.Day09Model={simulate,signal,coreInputs,appendixInputs};
  if(typeof module!=='undefined')module.exports=root.Day09Model;
})(typeof window==='undefined'?globalThis:window);
