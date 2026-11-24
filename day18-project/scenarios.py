"""固定种子噪声与独立的无噪声阶跃；二者不能混作同一个统计实验。"""
import numpy as np
from filtering import seeded_noise, lowpass, statistics, step_metrics


def run_scenario(scenario):
    if scenario not in range(7):
        raise ValueError("场景编号必须为0至6")
    alpha = [0.1, 0.8, 0.1, 0.8, 0.1, 1.0, 0.0][scenario]
    if scenario == 6:
        try:
            lowpass([10.0, 11.0], alpha)
        except ValueError as exc:
            # str把异常对象变成可显示的字符串；不返回有效滤波数值。
            return {"scenario": scenario, "status": -2, "valid": 0,
                    "error_kind": "invalid_alpha", "diagnostic": str(exc)}
        raise AssertionError("非法alpha应被拒绝")
    bias = 0.4 if scenario == 4 else 0.0
    seed = 18
    dt = 0.1
    raw = 10.0 + bias + seeded_noise(seed, 250)
    filtered = lowpass(raw, alpha)
    # 两组alpha使用相同种子、相同样本；舍弃前50项，减小初始化影响。
    before = statistics(raw[50:], 10.0)
    after = statistics(filtered[50:], 10.0)
    step, response, t10, t90, rise = step_metrics(alpha, dt)
    return {"scenario": scenario, "status": 0, "valid": 1, "seed": seed,
            "alpha": alpha, "dt_s": dt, "bias_injected": bias,
            "raw_variance": before["variance"], "filtered_variance": after["variance"],
            "raw_mean": before["mean"], "filtered_mean": after["mean"],
            "raw_std": before["std"], "filtered_std": after["std"],
            "raw_bias": before["bias"], "filtered_bias": after["bias"],
            "raw_rmse": before["rmse"], "filtered_rmse": after["rmse"],
            "t10_s": t10, "t90_s": t90, "rise_s": rise,
            # ndarray.tolist()把数组转为普通列表，供JSON序列化。
            "raw": raw.tolist(), "filtered": filtered.tolist(),
            "step": step.tolist(), "response": response.tolist()}
