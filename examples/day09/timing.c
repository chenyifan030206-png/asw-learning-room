#include "timing.h"
#include <stddef.h>
#include <math.h>

int Timeline_Run(
    float speed_mps,
    int skip_tick,
    int late_ms,
    struct Timeline *out)
{
    if (out == NULL) return -1;
    if (!isfinite(speed_mps) || speed_mps < 0.0f || speed_mps > 50.0f)
        return -2;
    if (skip_tick != -1 && (skip_tick < 1 || skip_tick > 5))
        return -2;
    if (late_ms < 0 || late_ms > 9)
        return -2;

    // 先在局部对象 draft 计算；成功后再交付给 main 的 result。
    struct Timeline draft = {0};
    int last_control_ms = 0;

    // tick=0..6，对应计划时刻 0、10、20、30、40、50、60ms。
    for (int tick = 0; tick <= 6; ++tick)
    {
        int scheduled_ms = tick * 10;

        // 独立的传感更新示例：每20ms记录一次。
        if (tick % 2 == 0)
        {
            draft.perception_ms[draft.perception_count] = scheduled_ms;
            ++draft.perception_count;
        }

        // 被选中的那轮控制更新不执行；last_control_ms也不更新。
        if (tick == skip_tick)
        {
            continue;
        }

        int now_ms = scheduled_ms;
        if (tick == 3)
        {
            now_ms += late_ms;
        }

        // control_count是已写入数量，也恰好是下一条可写下标。
        int index = draft.control_count;
        draft.control_ms[index] = now_ms;

        if (index > 0)
        {
            int elapsed_ms = now_ms - last_control_ms;
            draft.dt_ms[index] = elapsed_ms;
            float dt_s = (float)elapsed_ms / 1000.0f;

            draft.fixed_distance_m += speed_mps * 0.010f;
            draft.measured_distance_m += speed_mps * dt_s;
        }

        // 只有本轮控制确实执行后，才把“本次”作为下一轮的“上次”。
        last_control_ms = now_ms;
        ++draft.control_count;
    }

    // 将整个草稿结构体的值交给 out 所指向的 main 中 result。
    *out = draft;
    return 0;
}
