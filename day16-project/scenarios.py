"""D16七组固定的数学练习：每个案例只改变一个想研究的问题。

先验证最基础的旋转、平移，接着比较顺序和逆变换，再故意输入
错误角度或NaN。返回status和valid，是为了把可用坐标与错误诊断区分开。
网页会用JavaScript按同一数学约定演算，但不执行这里的Python。
"""
import math

import numpy as np

from geometry2d import (inverse_rigid, rigid_transform_deg, rotation_deg,
                        roundtrip_error_m, transform_direction,
                        transform_point, transform_points)

LANDMARKS_V = np.array([
    [0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [2.0, -1.0], [-1.0, 2.0]
], dtype=float)


def run_scenario(scenario: int) -> dict:
    """按照案例编号计算结果，再把状态和坐标装进字典交回demo.py。

    成功时status=0、valid=1；错误示例不返回可消费的world_point。
    这样main不需要猜测哪个数字是有效世界坐标。
    """
    if not isinstance(scenario, int) or scenario not in range(7):
        raise ValueError("场景必须是0到6的整数")

    if scenario == 5:
        # S06：NaN不是有效角度。应在构造矩阵前拒绝，
        # 而不是把一串NaN当作已定位的目标交给后续绘图。
        try:
            rigid_transform_deg(float("nan"), 10.0, 5.0)
        except ValueError as exc:
            return {"scenario": scenario, "status": -2, "valid": 0,
                    "error_kind": "nonfinite_angle", "diagnostic": str(exc)}
        raise AssertionError("NaN必须被拒绝")

    if scenario == 3:
        # S04故意省去“度→弧度”的转换：代码虽然能算，方向却是错的。
        # 错误点只在诊断字段里展示，不会冒充有效世界坐标。
        wrong_angle = 90.0  # 错将90度传给需要弧度的sin/cos。
        wrong = np.array([math.cos(wrong_angle), math.sin(wrong_angle)])
        expected = rotation_deg(90.0) @ np.array([1.0, 0.0])
        error_m = float(np.linalg.norm(wrong - expected))
        return {"scenario": scenario, "status": -3, "valid": 0,
                "error_kind": "degree_as_radian", "wrong_point": wrong.tolist(),
                "reference_point": expected.tolist(), "error_m": error_m,
                "diagnostic": "错误示范：math.cos(90)按90弧度计算；应先转换90度→π/2弧度"}

    if scenario == 0:
        transform = rigid_transform_deg(90.0, 0.0, 0.0)
        point = np.array([1.0, 0.0])
        world = transform_point(transform, point)
        return {"scenario": scenario, "status": 0, "valid": 1, "angle_deg": 90,
                "rotation_shape": list(rotation_deg(90.0).shape),
                "transform_shape": list(transform.shape),
                "vehicle_point": point.tolist(), "world_point": world.tolist(),
                "roundtrip_error_m": roundtrip_error_m(transform, point),
                "chart_count": 1}

    if scenario == 1:
        transform = rigid_transform_deg(90.0, 10.0, 5.0)
        point = np.array([1.0, 0.0])
        return {"scenario": scenario, "status": 0, "valid": 1,
                "angle_deg": 90, "translation_m": [10.0, 5.0],
                "vehicle_point": point.tolist(),
                "world_point": transform_point(transform, point).tolist(),
                "transform_shape": list(transform.shape),
                "roundtrip_error_m": roundtrip_error_m(transform, point),
                "chart_count": 1}

    if scenario == 2:
        # S03：列向量从右往左乘。translate@rotate表示先旋转再平移；
        # 交换顺序后，就变成先平移再围绕世界原点旋转，结果不同。
        rotate = rigid_transform_deg(90.0, 0.0, 0.0)
        translate = rigid_transform_deg(0.0, 2.0, 0.0)
        point = np.array([1.0, 0.0])
        correct = translate @ rotate
        swapped = rotate @ translate
        return {"scenario": scenario, "status": 0, "valid": 1,
                "vehicle_point": point.tolist(),
                "world_point": transform_point(correct, point).tolist(),
                "swapped_point": transform_point(swapped, point).tolist(),
                "composition_gap_m": float(np.linalg.norm(
                    transform_point(correct, point) -
                    transform_point(swapped, point))),
                "roundtrip_error_m": roundtrip_error_m(correct, point),
                "chart_count": 1}

    if scenario == 4:
        transform = rigid_transform_deg(30.0, 10.0, 5.0)
        point = np.array([3.0, -2.0])
        world = transform_point(transform, point)
        restored = transform_point(inverse_rigid(transform), world)
        return {"scenario": scenario, "status": 0, "valid": 1, "angle_deg": 30,
                "translation_m": [10.0, 5.0],
                "vehicle_point": point.tolist(), "world_point": world.tolist(),
                "restored_point": restored.tolist(),
                "roundtrip_error_m": roundtrip_error_m(transform, point),
                "chart_count": 1}

    # S07用相同的变换一次计算五个点，不必手写五次transform_point。
    # 除点之外，再单独转换车头方向(1,0)；方向末项是0，不加平移。
    transform = rigid_transform_deg(90.0, 10.0, 5.0)
    points_world = transform_points(transform, LANDMARKS_V)
    x_axis_world = transform_direction(transform, [1.0, 0.0])
    return {"scenario": scenario, "status": 0, "valid": 1,
            "angle_deg": 90, "translation_m": [10.0, 5.0],
            "points_shape": list(points_world.shape),
            "vehicle_points": LANDMARKS_V.tolist(),
            "world_points": points_world.tolist(),
            "vehicle_x_axis_world": x_axis_world.tolist(),
            "chart_count": 1}
