"""D17八组离线案例。每组围绕一项具体概念，不混淆浏览器与Python。"""
import numpy as np
from calculus import evaluate


def motion_samples(dt_s: float, noisy: bool = False):
    """在0到2秒内产生线性速度10+2t；可加入逐采样交替±0.1m/s误差。

    交替噪声是有意构造的教学反例，不代表真实传感器的噪声模型。
    无论dt为0.1还是0.05，连续真值始终是v(t)=10+2t。
    """
    if dt_s not in (0.1, 0.05):
        raise ValueError("教学数据只接受dt=0.1或0.05秒")
    n = round(2.0 / dt_s)
    t = np.linspace(0.0, 2.0, n + 1, dtype=np.float64)
    v = 10.0 + 2.0 * t
    if noisy:
        v = v + 0.1 * np.where(np.arange(n + 1) % 2 == 0, 1.0, -1.0)
    return t, v


def run_scenario(scenario: int) -> dict:
    """场景0–7。错误场景只返回诊断，不能冒充有效积分/加速度。"""
    if not isinstance(scenario, int) or not 0 <= scenario <= 7:
        raise ValueError("场景必须是0至7之间的整数")
    if scenario == 7:
        from calculus import checked_series
        try:
            checked_series([0.0, 0.1, 0.1, 0.2], [10.0, 10.0, 10.0, 10.0])
        except ValueError as exc:
            return {"scenario": scenario, "status": -2, "valid": 0,
                    "error_kind": "non_increasing_timestamp",
                    "diagnostic": str(exc), "chart_count": 0}
        raise AssertionError("重复时间戳本应被拒绝")

    if scenario == 6:
        t = np.array([0.0, 0.10, 0.25, 0.35], dtype=np.float64)
        v = 10.0 + 2.0 * t
        expected_m = 10.0 * 0.35 + 0.35 ** 2
        mode = "irregular_time"
        true_acc = 2.0
    else:
        dt = 0.05 if scenario in (1, 3, 5) else 0.10
        t, v = motion_samples(dt, noisy=scenario in (4, 5))
        if scenario in (0, 1):
            v = np.full_like(t, 10.0)
            expected_m = 20.0
            true_acc = 0.0
            mode = "constant_speed"
        else:
            expected_m = 24.0  # 积分(10+2t)从0到2秒：20+4=24m
            true_acc = 2.0
            mode = "linear_speed_with_alternating_error" if scenario in (4, 5) else "linear_speed"

    data = evaluate(t, v)
    acc_err = data["accel_mps2"] - true_acc
    return {
        "scenario": scenario, "status": 0, "valid": 1, "mode": mode,
        "dt_s": float(data["dt_s"][0]),
        "dt_min_s": float(np.min(data["dt_s"])),
        "dt_max_s": float(np.max(data["dt_s"])),
        "sample_count": len(t), "interval_count": len(t) - 1,
        "time_s": t.tolist(), "speed_mps": v.tolist(),
        "left_m": float(data["left_m"][-1]),
        "trapezoid_m": float(data["trapezoid_m"][-1]),
        "true_displacement_m": float(expected_m),
        "left_error_m": float(data["left_m"][-1] - expected_m),
        "trapezoid_error_m": float(data["trapezoid_m"][-1] - expected_m),
        "accel_mps2": data["accel_mps2"].tolist(),
        "accel_noise_rms_mps2": float(np.sqrt(np.mean(acc_err ** 2))),
        "first_interval_accel_mps2": float(data["accel_mps2"][0]),
        "displacement_series_m": data["trapezoid_m"].tolist(),
        "chart_count": 3,
    }
