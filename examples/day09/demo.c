#include "timing.h"
#include <stdio.h>

int main(void)
{
    float speed_mps = 0.0f;
    int skip_tick = -1;
    int late_ms = 0;

    // 三个输入：速度、跳过哪轮、30ms这轮迟到多少。
    if (scanf("%f %d %d", &speed_mps, &skip_tick, &late_ms) != 3)
    {
        printf("input_error=1\n");
        return 1;
    }

    // 定义真实输出对象。成员结构在 timing.h 的 struct Timeline 中声明。
    struct Timeline result = {0};

    // 通过 &result 提供地址，让函数可以填写这个对象。
    int status = Timeline_Run(speed_mps, skip_tick, late_ms, &result);
    printf("status=%d\n", status);
    if (status != 0)
    {
        return 0;
    }

    printf("control_ms=");
    for (int i = 0; i < result.control_count; ++i)
    {
        printf("%d%s", result.control_ms[i],
               i + 1 == result.control_count ? "\n" : ",");
    }

    printf("dt_ms=");
    for (int i = 0; i < result.control_count; ++i)
    {
        printf("%d%s", result.dt_ms[i],
               i + 1 == result.control_count ? "\n" : ",");
    }

    printf("perception_ms=");
    for (int i = 0; i < result.perception_count; ++i)
    {
        printf("%d%s", result.perception_ms[i],
               i + 1 == result.perception_count ? "\n" : ",");
    }

    printf("control_count=%d\n", result.control_count);
    printf("update_count=%d\n", result.control_count - 1);
    printf("perception_count=%d\n", result.perception_count);
    printf("fixed_distance_m=%.6f\n", (double)result.fixed_distance_m);
    printf("measured_distance_m=%.6f\n", (double)result.measured_distance_m);
    return 0;
}
