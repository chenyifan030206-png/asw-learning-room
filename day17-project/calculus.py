"""D17离散运动计算：从速度样本求位移，从相邻速度求加速度。

约定：
- 时间戳单位秒（s），必须严格递增；不是“第几帧”。
- 速度单位m/s；输出累计位移m，差分加速度m/s²。
- 左矩形积分假设一个区间内使用左端速度；梯形积分假设区间内速度线性变化。
- 这些是离线数值教学函数，不是车载实时估计器。
"""
import numpy as np


def checked_series(time_s, speed_mps):
    """统一检查两列数据，避免零dt、时间倒退、NaN或长度不一致。

    Python里的np.diff(t)会返回相邻时间差；如果有0或负数，
    差分计算就会除以0或把时间倒退误当成正常采样。
    """
    t = np.asarray(time_s, dtype=np.float64)
    v = np.asarray(speed_mps, dtype=np.float64)
    if t.ndim != 1 or v.ndim != 1 or len(t) != len(v) or len(t) < 2:
        raise ValueError("时间与速度必须是长度相同、至少两项的一维数组")
    if not np.isfinite(t).all() or not np.isfinite(v).all():
        raise ValueError("时间与速度必须全部是有限数字")
    dt = np.diff(t)
    if np.any(dt <= 0):
        raise ValueError("时间戳必须严格递增，不允许dt为0或负数")
    return t, v, dt


def left_displacement(time_s, speed_mps):
    """用每个区间左端的速度估算路程增量，返回累计位移数组。

    第i段的位移增加 v[i]*(t[i+1]-t[i])。所以N+1个采样点
    只会形成N个时间区间；最后一个速度值没有对应的下一段。
    """
    t, v, dt = checked_series(time_s, speed_mps)
    increments = v[:-1] * dt
    return np.concatenate(([0.0], np.cumsum(increments)))


def trapezoid_displacement(time_s, speed_mps):
    """用区间两端速度的平均值估算位移，返回每个采样时刻的累计位移。

    梯形面积是(v[i]+v[i+1])/2*dt；速度在区间内为直线时，
    它恰好等于该区间的真实面积。弯曲速度并不保证精确。
    """
    t, v, dt = checked_series(time_s, speed_mps)
    increments = 0.5 * (v[:-1] + v[1:]) * dt
    return np.concatenate(([0.0], np.cumsum(increments)))


def interval_acceleration(time_s, speed_mps):
    """逐区间计算速度变化率；结果比速度样本少一个。

    返回(mid_times, acc)。加速度对应每段(t[i],t[i+1])的
    时间中点，只是一种图示定位；不等于额外测量了一帧加速度。
    """
    t, v, dt = checked_series(time_s, speed_mps)
    return 0.5 * (t[:-1] + t[1:]), np.diff(v) / dt


def evaluate(time_s, speed_mps):
    """把积分和差分组合成有明确单位、shape的计算结果。"""
    t, v, dt = checked_series(time_s, speed_mps)
    left = left_displacement(t, v)
    trap = trapezoid_displacement(t, v)
    mid, acc = interval_acceleration(t, v)
    return {
        "time_s": t,
        "speed_mps": v,
        "dt_s": dt,
        "left_m": left,
        "trapezoid_m": trap,
        "accel_mid_s": mid,
        "accel_mps2": acc,
    }
