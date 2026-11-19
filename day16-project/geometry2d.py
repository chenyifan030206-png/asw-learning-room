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
    """把调用者传进来的角度或位移变成有限浮点数。

    先用float转换，再检查是否为NaN或无穷大。这样错误会在
    构造矩阵之前被发现，避免把无效坐标继续传给后面的计算。
    """
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{name}必须是数字") from exc
    if not math.isfinite(number):
        raise ValueError(f"{name}必须是有限数")
    return number


def rotation_deg(angle_deg: float) -> np.ndarray:
    """输入角度（度），返回把车体系方向表示到世界系的2×2矩阵。

    约定：正角逆时针，两维点用列向量。比如角度为90°时，
    R @ [1,0] 应接近 [0,1]，也就是车前方转到了世界的上方。
    """
    angle = _finite_number(angle_deg, "angle_deg")
    # 日常说的90°不是三角函数要用的数字。先换成π/2弧度，
    # 再让cos、sin求出箭头在世界x、y轴上的两个投影。
    radians = np.deg2rad(angle)
    c = float(np.cos(radians))
    s = float(np.sin(radians))
    # 第一列(c,s)：车体x单位箭头旋转后的世界方向；
    # 第二列(-s,c)：车体y单位箭头旋转后的世界方向。
    # 例如90°时，两列分别是(0,1)和(-1,0)。
    return np.array([[c, -s], [s, c]], dtype=np.float64)


def rigid_transform_deg(angle_deg: float, tx_m: float, ty_m: float) -> np.ndarray:
    """把车辆的朝向和位置放到同一张3×3变换矩阵里。

    angle_deg是车头相对世界x轴的角度（度）。tx_m、ty_m
    是车体原点在世界系里的坐标，单位都是米。
    例如90°、(10,5)会把车前方(1,0)转换成世界(10,6)。
    """
    tx = _finite_number(tx_m, "tx_m")
    ty = _finite_number(ty_m, "ty_m")
    rotation = rotation_deg(angle_deg)
    # 先准备3×3单位矩阵：对角线是1，其余位置是0。
    # [:2,:2]代表第0、1行与第0、1列交叉的四个格子。
    # [:2,2]代表第2列中的第0、1行，正好放车的世界位置。
    transform = np.eye(3, dtype=np.float64)
    transform[:2, :2] = rotation
    transform[:2, 2] = [tx, ty]
    return transform


def _checked_transform(transform: np.ndarray) -> np.ndarray:
    """检查这是否真的是可用于二维刚体坐标转换的3×3矩阵。

    除了形状和NaN，还要求最后一行是[0,0,1]；
    旋转部分不能拉伸或翻转坐标，否则R.T就不再是这里假设的逆旋转。
    """
    matrix = np.asarray(transform, dtype=np.float64)
    if matrix.shape != (3, 3) or not np.isfinite(matrix).all():
        raise ValueError("变换矩阵必须是3×3有限数矩阵")
    # matrix[2]取第2行，也就是齐次变换最下面那三个格子。
    if not np.allclose(matrix[2], [0.0, 0.0, 1.0], rtol=0, atol=1e-12):
        raise ValueError("齐次矩阵最后一行必须是[0,0,1]")
    rotation = matrix[:2, :2]
    # 正交旋转需要R.T@R≈I；这保证旋转后长度和直角关系不变。
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
    """将车体系中的(x,y)点转成世界系的(x,y)，单位米。

    先确认T和点合法，再把二维点补成(x,y,1)。最后那个1
    会使T的平移列参与计算；返回时去掉辅助的第三项。
    """
    matrix = _checked_transform(transform)
    p = _point2(point_vehicle_m)
    # p[0]、p[1]分别取车体x、y。最后补的1不是高度1米，
    # 是为了让旋转和平移能用同一次矩阵乘法完成。
    p_h = np.array([p[0], p[1], 1.0], dtype=np.float64)
    result_h = matrix @ p_h  # @做矩阵乘法；不能改成逐元素乘法*。
    return result_h[:2]      # [:2]只取最前面两个坐标分量。


def transform_direction(transform: np.ndarray, direction_vehicle: np.ndarray) -> np.ndarray:
    """转换一根箭头的方向，不改变它的长度，也不加车辆位置。

    箭头只说明“朝哪儿”，不说明“在哪里”。所以末项写0，
    与具体位置点(x,y,1)不同；平移列乘0后不会参与计算。
    """
    matrix = _checked_transform(transform)
    v = _point2(direction_vehicle)
    v_h = np.array([v[0], v[1], 0.0], dtype=np.float64)
    return (matrix @ v_h)[:2]


def transform_points(transform: np.ndarray, points_vehicle_m: np.ndarray) -> np.ndarray:
    """把N个车体系点一次换算成世界系坐标。

    输入是N行2列，每行[x,y]。先补一列1，得到N行3列；
    转置成3行N列后就可以左乘3×3的T，最后再转置回来。
    这只是在一次运算里处理所有点，并不会改变坐标变换的数学定义。
    """
    matrix = _checked_transform(transform)
    points = np.asarray(points_vehicle_m, dtype=np.float64)
    if points.ndim != 2 or points.shape[1] != 2 or not np.isfinite(points).all():
        raise ValueError("批量点数组必须是(N,2)有限数矩阵")
    # points.shape[0]是点的行数N，np.ones((N,1))会生成N个1。
    ones = np.ones((points.shape[0], 1), dtype=np.float64)
    # axis=1指按列拼接：从(N,2)变成(N,3)。
    points_h = np.concatenate((points, ones), axis=1)
    # .T把(N,3)换成(3,N)，这样T(3,3)就能乘每一列的点。
    transformed_h = (matrix @ points_h.T).T
    return transformed_h[:, :2]  # 全部N行，只保留x和y两列。


def inverse_rigid(transform: np.ndarray) -> np.ndarray:
    """得到从世界系回到车体系的变换矩阵。

    正向是先旋转R再平移t；反过来必须先减t再逆旋转。
    对纯旋转矩阵，R的逆就是转置R.T，故逆平移应写-R.T@t。
    """
    matrix = _checked_transform(transform)
    r = matrix[:2, :2]
    t = matrix[:2, 2]
    inverse = np.eye(3, dtype=np.float64)
    inverse[:2, :2] = r.T
    # 先把世界位置t换到车体的方向，再取负值。
    # 只写-t通常是错的，因为还没有撤销原来的旋转。
    inverse[:2, 2] = -(r.T @ t)
    return inverse


def roundtrip_error_m(transform: np.ndarray, point: np.ndarray) -> float:
    """先变到世界系，再变回车体系，检查恢复得有多准确。

    对照的是恢复后的两个坐标与原点的距离，单位米。
    理想情况下为0；浮点运算允许非常小的尾差，本课要求<1e-9m。
    """
    original = _point2(point)
    forward = transform_point(transform, original)
    recovered = transform_point(inverse_rigid(transform), forward)
    return float(np.linalg.norm(recovered - original))
