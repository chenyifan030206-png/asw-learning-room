/* 附录：补回原计划D08，不属于D09主课的必做实作。 */
#ifndef ASW_SIGNAL_H
#define ASW_SIGNAL_H
struct VehicleSignal {
    float value_mps; /* 数值，例如10m/s。 */
    long stamp_ms;   /* 这份数据被标记的时刻；long是有符号整数，至少32位。 */
    int valid;       /* 1表示发送方认为有效；0表示无效。 */
    int source;      /* 本例1=雷达、2=车辆；0=未知，拒绝。 */
};
/* 0新鲜；-1空地址；-2字段非法；-3未来时间戳；-4年龄超过100ms。 */
int Signal_Check(const struct VehicleSignal *signal, long now_ms);
#endif
