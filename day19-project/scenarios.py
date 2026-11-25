"""控制实验条件、调用估计器、最后用真值评价。真值不参与状态更新。"""
import numpy as np
from kalman import KalmanCV
from simulation import generate


def estimate(z, dt, q, r):
    """估计流水线只接收测量序列和配置；不允许传入真值。"""
    if len(z) == 0 or z[0] is None:
        raise ValueError("需要有效首帧位置进行初始化")
    kf = KalmanCV(dt, q, r, z[0])
    positions, speeds, pp, pv = [], [], [], []
    innovations, gains = [], []
    # enumerate(iterable)逐项产生(索引,元素)；k=0只初始化。
    for k, measurement in enumerate(z):
        innovation, gain = (None, None) if k == 0 else kf.step(measurement)
        positions.append(float(kf.x[0]))
        speeds.append(float(kf.x[1]))
        pp.append(float(kf.P[0, 0]))
        pv.append(float(kf.P[1, 1]))
        innovations.append(innovation)
        gains.append(gain)
    return positions, speeds, pp, pv, innovations, gains


def rmse(prediction, truth):
    """np.asarray转换数组；**2逐元素平方；mean求均值；sqrt开平方。"""
    e = np.asarray(prediction) - np.asarray(truth)
    return float(np.sqrt(np.mean(e**2)))


def run_scenario(scenario):
    if scenario not in range(7):
        raise ValueError("场景编号必须在0至6之间")
    dt = 0.1
    q = [0.25, 0.25, 0.25, 0.25, 4., 0., 0.25][scenario]
    r = 3.0 if scenario == 2 else 0.0 if scenario == 6 else 1/3
    if scenario == 6:
        try:
            KalmanCV(dt, q, r, 0.)
        except ValueError as exc:
            return {"scenario": scenario, "status": -2, "valid": 0,
                    "error_kind": "invalid_r", "diagnostic": str(exc)}
        raise AssertionError("非法R应被拒绝")
    t, truth_p, truth_v, z = generate(scenario in (3, 4, 5), scenario == 1)
    # 关键边界：estimate的参数不包含truth_p、truth_v。
    p, v, pp, pv, innovations, gains = estimate(z, dt, q, r)
    available = [k for k, value in enumerate(z) if value is not None]
    # 列表推导式选择相同有效观测帧，避免不同统计窗口的不公平比较。
    measured = [z[k] for k in available]
    reference = truth_p[available]
    return {"scenario": scenario, "status": 0, "valid": 1, "dt_s": dt,
            "q": q, "r": r, "sample_count": len(z),
            "predict_only_count": len(z) - len(available),
            "update_count": len(available) - 1,
            "raw_position_rmse_m": rmse(measured, reference),
            "estimated_position_rmse_available_m": rmse([p[k] for k in available], reference),
            "position_rmse_m": rmse(p, truth_p), "speed_rmse_mps": rmse(v, truth_v),
            "p_position_before_gap": pp[19], "p_position_end_gap": pp[24],
            "p_position_after_gap": pp[25],
            "t": t.tolist(), "truth_p": truth_p.tolist(), "truth_v": truth_v.tolist(),
            "z": z, "p": p, "v": v, "pp": pp, "pv": pv,
            "innovations": innovations, "gains": gains}
