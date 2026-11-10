"""本项目的数据协议：类似C语言的头文件，集中定义共享数据类型。

Python中的@dataclass会自动生成构造函数；并不代表量产ECU数据接口。
"""
from dataclasses import dataclass


@dataclass
class Frame:
    # 输入帧：下列名称、类型提示和单位是本项目约定的接口合同。
    time_ms: int           # 采样时间（毫秒，整数）。
    speed_kmh: float       # 车速（km/h）。
    distance_m: float      # 与前车距离（m）。
    radar_valid: bool      # 雷达数据是否有效。
    enable: bool           # 是否使能监视功能。


@dataclass
class Decision:
    # 输出结果：与C中的MonitorResult结构体用途相近。
    time_ms: int           # 对应输入帧的时间戳。
    status: str            # ACTIVE / OFF / INVALID。
    valid: bool            # 告警判断能否用于后续处理。
    alert: bool            # 当前距离提示，不是制动请求。
    age_ms: int            # 当前时刻-采样时刻。


# 注意：例如speed_kmh: float属于类型提示。它本身不会自动拒绝字符串；
# 真正的数据检查在reader.py和monitor.py中明确实现。
