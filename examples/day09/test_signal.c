/* 附录自己的测试入口，主课不开启附录时不构建。 */
#include "signal.h"
#include <stddef.h>
int main(void) {
    struct VehicleSignal s = {10.0f,950L,1,1};
    if (Signal_Check(&s,1000L)!=0) return 1;
    s.stamp_ms=900L; if (Signal_Check(&s,1000L)!=0) return 2;
    s.stamp_ms=899L; if (Signal_Check(&s,1000L)!=-4) return 3;
    s.stamp_ms=1001L; if (Signal_Check(&s,1000L)!=-3) return 4;
    s.stamp_ms=950L;s.valid=0; if (Signal_Check(&s,1000L)!=-2) return 5;
    s.valid=1;s.source=0; if (Signal_Check(&s,1000L)!=-2) return 6;
    if (Signal_Check(NULL,1000L)!=-1) return 7;
    return 0;
}
