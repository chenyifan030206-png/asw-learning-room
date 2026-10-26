#ifndef ASW_TIMING_H
#define ASW_TIMING_H

// 类型定义：这些成员决定 Timeline 对象内部有哪些数据。
struct Timeline
{
    int control_ms[7];       // 按顺序保存实际执行控制的时刻，单位ms。
    int dt_ms[7];            // 对应每次与上一次有效控制的时间差。
    int perception_ms[4];    // 独立记录的传感处理时刻：0/20/40/60ms。
    int control_count;       // 已填写的控制时刻行数，包含初始0ms一行。
    int perception_count;    // 已填写的感知时刻行数。
    float fixed_distance_m;  // 每次更新都按0.010s估计。
    float measured_distance_m;// 每次更新按实际dt估计。
};

// 函数声明：int是状态；前三个值是输入；out是可写的结果对象地址。
int Timeline_Run(
    float speed_mps,
    int skip_tick,
    int late_ms,
    struct Timeline *out
);

#endif
