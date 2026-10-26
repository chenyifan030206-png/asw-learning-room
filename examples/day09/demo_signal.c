/* 附录的独立入口；主课demo只读三项，不必先理解这里五项。 */
#include "signal.h"
#include <stdio.h>
int main(void) {
    struct VehicleSignal s = {0};
    long now_ms;
    if (scanf("%f %ld %ld %d %d",&s.value_mps,&now_ms,&s.stamp_ms,&s.valid,&s.source)!=5) return 1;
    int status=Signal_Check(&s,now_ms);
    printf("status=%d\nvalid=%d\n",status,status==0);
    if (status==0 || status==-4) printf("age_ms=%ld\n",now_ms-s.stamp_ms);
    return 0;
}
