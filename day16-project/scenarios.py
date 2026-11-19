"""D16的7个离线教学场景：输出字段与网页JS模拟逐项对账。"""
import math

import numpy as np

from geometry2d import (inverse_rigid, rigid_transform_deg, rotation_deg,
                        roundtrip_error_m, transform_direction,
                        transform_point, transform_points)

LANDMARKS_V = np.array([
    [0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [2.0, -1.0], [-1.0, 2.0]
], dtype=float)


def run_scenario(scenario: int) -> dict:
    """返回含status/valid的结果，错误示例不提供合法world_point。"""
    if not isinstance(scenario, int) or scenario not in range(7):
        raise ValueError("场景必须是0到6的整数")

    if scenario == 5:
        # S06显式拒绝角度NaN。不构造可消费的变换矩阵。
        try:
            rigid_transform_deg(float("nan"), 10.0, 5.0)
        except ValueError as exc:
            return {"scenario": scenario, "status": -2, "valid": 0,
                    "error_kind": "nonfinite_angle", "diagnostic": str(exc)}
        raise AssertionError("NaN必须被拒绝")

    if scenario == 3:
        # S04 故意漏掉deg2rad，构造错误结果仅用于诊断。
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
        # 列向量约定：T=Translation@Rotation表示先旋转，再平移。
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

    # S07 一个坐标系转换多组地标点，显示向量(齐次w=0)和点(w=1)差异。
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
