/* 独立测试程序：不用键盘，给固定输入，按自己算的预期检查。 */
#include "timing.h"
#include <math.h> /* fabsf把float差值取绝对值，允许小量浮点舍入误差。 */
#include <stdio.h>
#include <stddef.h>

int main(void) {
    struct Timeline r = {0};
    int status = Timeline_Run(10.0f,-1,0,&r);
    if (status != 0 || r.control_count != 7 || r.perception_count != 4 || fabsf(r.measured_distance_m-0.6f)>0.0001f) return 1;
    status = Timeline_Run(10.0f,3,0,&r);
    if (status != 0 || r.control_ms[3] != 40 || r.dt_ms[3] != 20 || fabsf(r.fixed_distance_m-0.5f)>0.0001f || fabsf(r.measured_distance_m-0.6f)>0.0001f) return 2;
    status = Timeline_Run(10.0f,-1,5,&r);
    if (status != 0 || r.control_ms[3] != 35 || r.dt_ms[3] != 15 || r.dt_ms[4] != 5) return 3;
    status = Timeline_Run(10.0f,3,0,&r);
    if (status != 0 || r.perception_ms[0] != 0 || r.perception_ms[1] != 20 || r.perception_ms[2] != 40 || r.perception_ms[3] != 60) return 4;
    /* 失败不能破坏之前的结果对象；比较具体成员，不比较含可能填充字节的整个struct。 */
    status = Timeline_Run(-1.0f,-1,0,&r);
    if (status != -2 || r.control_count != 6 || r.control_ms[3] != 40) return 5;
    status = Timeline_Run(10.0f,-1,0,NULL);
    if (status != -1) return 6;
    status = Timeline_Run(10.0f,0,0,&r);
    if (status != -2) return 7;
    status = Timeline_Run(10.0f,3,5,&r);
    if (status != 0 || r.control_ms[3] != 40 || r.dt_ms[3] != 20) return 8;
    status = Timeline_Run(20.0f,3,0,&r);
    if (status != 0 || fabsf(r.fixed_distance_m-1.0f)>0.000001f || fabsf(r.measured_distance_m-1.2f)>0.000001f) return 9;
    status = Timeline_Run(NAN,-1,0,&r);
    if (status != -2 || r.control_count != 6) return 10;
    status = Timeline_Run(INFINITY,-1,0,&r);
    if (status != -2 || r.control_count != 6) return 11;
    status = Timeline_Run(10.0f,-1,10,&r);
    if (status != -2 || r.control_ms[3] != 40) return 12;
    printf("checks_passed=12\n");
    return 0;
}
