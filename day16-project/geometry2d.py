"""D16：二维坐标、旋转和齐次变换的数学实现（NumPy，列向量约定）。

约定：车体系 V 中的点 p_V（单位m）映射到世界系 W：
    p_W = R_WV @ p_V + t_WV
    pW_h = T_WV @ pV_h
角度从世界系+x轴逆时针为正；输入角度用度数，函数内部显式转为弧度。
不是实车定位、控制指令或ROS tf2实现。
"""
import math

import numpy as np


def _finite_number(value: float, name: str) -> float:
    """把标量转成浮点数，拒绝字符串非法、NaN和无穷大。"""
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name}必须是数字") from exc
    if not math.isfinite(number):
        raise ValueError(f"{name}必须是有限数")
    return number


def rotation_deg(angle_deg: float) -> np.ndarray:
    """逆时针二维旋转矩阵R，shape=(2,2)；角度单位度。"""
    angle = _finite_number(angle_deg, "angle_deg")
    radians = np.deg2rad(angle)  # np.cos/sin要求弧度，这一步不能省。
    c = float(np.cos(radians))
    s = float(np.sin(radians))
    # 每行的两个数是矩阵的两列元素，不是两个点。
    return np.array([[c, -s], [s, c]], dtype=np.float64)


def rigid_transform_deg(angle_deg: float, tx_m: float, ty_m: float) -> np.ndarray:
    """T_WV：把车体系点转到世界系；平移单位米。"""
    tx = _finite_number(tx_m, "tx_m")
    ty = _finite_number(ty_m, "ty_m")
    rotation = rotation_deg(angle_deg)
    transform = np.eye(3, dtype=np.float64)  # 初始单位矩阵3×3。
    transform[:2, :2] = rotation             # 左上角2×2放R。
    transform[:2, 2] = [tx, ty]             # 最后一列上两项放平移。
    return transform


def _checked_transform(transform: np.ndarray) -> np.ndarray:
    """明确检查3×3齐次刚体变换，避免形状和非有限数被继续使用。"""
    matrix = np.asarray(transform, dtype=np.float64)
    if matrix.shape != (3, 3) or not np.isfinite(matrix).all():
        raise ValueError("变换矩阵必须是3×3有限数矩阵")
    if not np.allclose(matrix[2], [0.0, 0.0, 1.0], rtol=0, atol=1e-12):
        raise ValueError("齐次矩阵最后一行必须是[0,0,1]")
    rotation = matrix[:2, :2]
    if not np.allclose(rotation.T @ rotation, np.eye(2), rtol=0, atol=1e-9):
        raise ValueError("左上角2×2矩阵不是正交旋转矩阵")
    if not np.isclose(np.linalg.det(rotation), 1.0, rtol=0, atol=1e-9):
        raise ValueError("旋转矩阵行列式必须为+1")
    return matrix


def _point2(point: np.ndarray) -> np.ndarray:
    vector = np.asarray(point, dtype=np.float64)
    if vector.shape != (2,) or not np.isfinite(vector).all():
        raise ValueError("二维点必须含两个有限数[x_m,y_m]")
    return vector


def transform_point(transform: np.ndarray, point_vehicle_m: np.ndarray) -> np.ndarray:
    """把单个车体系点转换到世界系，返回shape=(2,)的坐标。"""
    matrix = _checked_transform(transform)
    p = _point2(point_vehicle_m)
    p_h = np.array([p[0], p[1], 1.0], dtype=np.float64)
    result_h = matrix @ p_h   # @为矩阵乘法；不是NumPy逐元素*。
    return result_h[:2]       # 去掉齐次最后的1，仅保留x、y米。


def transform_direction(transform: np.ndarray, direction_vehicle: np.ndarray) -> np.ndarray:
    """向量（不是点）齐次分量w=0，因此不受平移影响。"""
    matrix = _checked_transform(transform)
    v = _point2(direction_vehicle)
    v_h = np.array([v[0], v[1], 0.0], dtype=np.float64)
    return (matrix @ v_h)[:2]


def transform_points(transform: np.ndarray, points_vehicle_m: np.ndarray) -> np.ndarray:
    """同时变换N个点：输入(N,2)，输出(N,2)；不用逐行手写for。"""
    matrix = _checked_transform(transform)
    points = np.asarray(points_vehicle_m, dtype=np.float64)
    if points.ndim != 2 or points.shape[1] != 2 or not np.isfinite(points).all():
        raise ValueError("批量点数组必须是(N,2)有限数矩阵")
    ones = np.ones((points.shape[0], 1), dtype=np.float64)
    points_h = np.concatenate((points, ones), axis=1)  # 每点拼上w=1。
    transformed_h = (matrix @ points_h.T).T            # 每列是一个点。
    return transformed_h[:, :2]


def inverse_rigid(transform: np.ndarray) -> np.ndarray:
    """解析构造逆变换T_VW：R转置，平移为-R.T@t。"""
    matrix = _checked_transform(transform)
    r = matrix[:2, :2]
    t = matrix[:2, 2]
    inverse = np.eye(3, dtype=np.float64)
    inverse[:2, :2] = r.T
    inverse[:2, 2] = -(r.T @ t)
    return inverse


def roundtrip_error_m(transform: np.ndarray, point: np.ndarray) -> float:
    """p_V→p_W→p_V，返回欧氏误差（米）；理论上零，数值允许浮点尾差。"""
    original = _point2(point)
    forward = transform_point(transform, original)
    recovered = transform_point(inverse_rigid(transform), forward)
    return float(np.linalg.norm(recovered - original))
