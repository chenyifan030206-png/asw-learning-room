"""只在教学场景中生成真值和位置传感器观测。估计器不得读取真值。"""
import numpy as np


def generate(maneuver=False, dropout=False):
    """81帧，dt=0.1秒。可选加速度段和连续5帧位置缺测。"""
    dt, count, seed = 0.1, 81, 19
    # np.arange(count)生成0..count-1；乘dt构造等间隔教学时间轴。
    t = np.arange(count) * dt
    # np.zeros(n)返回n个0组成的数组；随后逐帧填入真值。
    p, v = np.zeros(count), np.zeros(count)
    v[0] = 2.0
    for k in range(1, count):
        a = 0.8 if maneuver and 30 <= k < 50 else 0.0
        p[k] = p[k-1] + dt * v[k-1] + 0.5 * a * dt**2
        v[k] = v[k-1] + a * dt
    # D18同款确定性教学伪随机递推；不代表实际传感器噪声模型。
    z = []
    state = seed
    for k in range(count):
        state = (1664525 * state + 1013904223) % (2**32)
        noise = 2.0 * state / (2**32) - 1.0
        # .append(value)在列表末尾添加一个元素，返回None。
        z.append(None if dropout and 20 <= k < 25 else float(p[k] + noise))
    return t, p, v, z
