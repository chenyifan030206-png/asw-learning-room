"""D18：统计量与一阶低通滤波。输入为一维离线速度序列（m/s）。"""
import numpy as np


def seeded_noise(seed=18, count=250):
    """固定种子的教学伪随机序列，范围[-1,1)，不是实车噪声模型。
    使用简单的线性同余生成器，便于Python与浏览器逐样本对账。
    不将它用于密码、严肃随机模拟或实际传感器噪声辨识。
    """
    # np.empty(count, dtype=...) 分配count个尚未初始化的浮点位置；
    # 必须逐个填好才能读取。range(count)依次产生0至count-1。
    values = np.empty(count, dtype=np.float64)
    state = seed
    for i in range(count):
        # % 求余；将整数状态约束到0..2**32-1，再缩放到[-1,1)。
        state = (1664525 * state + 1013904223) % (2 ** 32)
        values[i] = 2.0 * state / (2 ** 32) - 1.0
    return values


def lowpass(samples, alpha):
    """y[0]=x[0]；y[k]=y[k-1]+alpha*(x[k]-y[k-1])，0<alpha<=1。"""
    # np.asarray把列表统一为数组；float64是64位浮点类型。
    x = np.asarray(samples, dtype=np.float64)
    if x.ndim != 1 or len(x) == 0 or not np.isfinite(x).all():
        raise ValueError("输入必须是非空、有限的一维序列")
    if not np.isfinite(alpha) or not 0 < alpha <= 1:
        raise ValueError("alpha必须大于0且不超过1")
    # np.empty_like(x)创建与x形状、类型相同的未初始化数组。
    y = np.empty_like(x)
    y[0] = x[0]
    for k in range(1, len(x)):
        # 当前输出需要上一时刻的滤波结果，而不是上一时刻原始读数。
        y[k] = y[k-1] + alpha * (x[k] - y[k-1])
    return y


def statistics(samples, truth):
    """计算均值、总体形式的描述性方差、标准差、偏差及均方根误差。"""
    x = np.asarray(samples, dtype=np.float64)
    # mean求和后除以元素数；var(ddof=0)除以N，描述当前记录的波动。
    mean = float(np.mean(x))
    variance = float(np.var(x, ddof=0))
    # std是方差的平方根；单位回到m/s，而不是(m/s)^2。
    std = float(np.std(x, ddof=0))
    # sqrt为开平方；**2表示逐元素平方。RMSE以真值为基准。
    rmse = float(np.sqrt(np.mean((x - truth) ** 2)))
    return {"mean": mean, "variance": variance, "std": std,
            "bias": mean - truth, "rmse": rmse}


def step_metrics(alpha, dt=0.1):
    """无噪声单位阶跃：第20号样本起输入从0变1，输出初值0。
    t10、t90从阶跃首个样本计时，取首次达到阈值的采样时刻；
    rise=t90-t10，不做采样点之间的插值。
    """
    # np.zeros(100)创建100个0；[20:]选第20号及以后。
    x = np.zeros(100, dtype=np.float64)
    x[20:] = 1.0
    y = lowpass(x, alpha)
    # np.flatnonzero返回条件为真的一维索引；1e-12只处理阈值浮点尾差。
    i10 = np.flatnonzero(y[20:] >= 0.1 - 1e-12)
    i90 = np.flatnonzero(y[20:] >= 0.9 - 1e-12)
    # 未在观察窗达到阈值时返回None，而不是捏造一个时间。
    t10 = float(i10[0] * dt) if len(i10) else None
    t90 = float(i90[0] * dt) if len(i90) else None
    rise = t90 - t10 if t10 is not None and t90 is not None else None
    return x, y, t10, t90, rise
