"""一维位置/速度卡尔曼滤波器：只接收配置与位置测量，不接触真值。"""
import numpy as np


class KalmanCV:
    """恒速度预测模型。x=[位置(m),速度(m/s)]；P为2×2估计误差协方差。"""

    def __init__(self, dt, q, r, first_z):
        # np.isfinite逐元素判断是否有限；.all()要求所有判断为True。
        if not np.isfinite([dt, q, r, first_z]).all() or dt <= 0 or q < 0 or r <= 0:
            raise ValueError("要求有限数值、dt>0、q>=0、r>0")
        self.dt, self.r = dt, r
        # np.array把嵌套列表转换为二维数组；dtype指定浮点类型。
        self.F = np.array([[1., dt], [0., 1.]], dtype=np.float64)
        self.H = np.array([[1., 0.]])
        g = np.array([[dt**2 / 2], [dt]])
        # @是矩阵乘法；.T交换行列。G(2,1)@G.T(1,2)得到(2,2)。
        self.Q = q * (g @ g.T)
        # 初始位置只来自首帧测量，初始速度0是先验，不是真实速度。
        self.x = np.array([first_z, 0.], dtype=np.float64)
        # np.diag(一维数组)构造对角矩阵；初始速度方差4 (m/s)^2。
        self.P = np.diag([r, 4.])
        # np.eye(n)构造n×n单位矩阵；Joseph协方差更新要用。
        self.I = np.eye(2)

    def predict(self):
        """根据上一帧后验推算当前帧先验，不需要测量。"""
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q

    def update(self, z):
        """只在有效位置测量存在时进行更新；返回创新与两个增益。"""
        if not np.isfinite(z):
            raise ValueError("测量必须为有限数字")
        # H(1,2)@x(2,)得到长度1的数组，[0]取标量。
        innovation = float(z - (self.H @ self.x)[0])
        # H P H.T 为1×1矩阵，[0,0]取元素。R>0确保S为正（有效P下）。
        s = float((self.H @ self.P @ self.H.T)[0, 0] + self.r)
        k = (self.P @ self.H.T) / s
        self.x = self.x + k[:, 0] * innovation
        # Joseph形式：两个矩阵项相加，避免仅做减法时的数值抵消。
        a = self.I - k @ self.H
        self.P = a @ self.P @ a.T + self.r * (k @ k.T)
        self.P = 0.5 * (self.P + self.P.T)
        # .tolist()将NumPy数组变为普通列表，便于结果JSON序列化。
        return innovation, k[:, 0].tolist()

    def step(self, z):
        """一帧事务：先验证，再预测；None表示缺测，只预测不更新。"""
        if z is not None and not np.isfinite(z):
            raise ValueError("无效测量不是缺测；请使用None明确表示缺测")
        self.predict()
        if z is None:
            return None, None
        return self.update(z)
