/* 附录：数据年龄=当前时刻-数据标记时刻，不是主课两次运行之间的dt。 */
#include "signal.h"
#include <stddef.h>
#include <math.h>
int Signal_Check(const struct VehicleSignal *signal, long now_ms) {
    if (signal == NULL) return -1;
    /* ->用于通过指针查看对象成员，等价于(*signal).valid这类写法。 */
    if (signal->valid != 1 || (signal->source != 1 && signal->source != 2)) return -2;
    if (!isfinite(signal->value_mps) || signal->value_mps<0 || signal->value_mps>50) return -2;
    /* 本演示先限制范围，再相减，避免一般超大long相减溢出。 */
    if (now_ms<0 || now_ms>1000000L || signal->stamp_ms<0 || signal->stamp_ms>1000000L) return -2;
    if (signal->stamp_ms > now_ms) return -3;
    long age_ms = now_ms - signal->stamp_ms;
    if (age_ms > 100L) return -4; /* 恰好100ms允许；101ms拒绝。 */
    return 0;
}
