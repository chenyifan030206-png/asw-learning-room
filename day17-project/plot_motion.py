"""三张独立中文图：速度、累计位移、区间加速度。"""
from pathlib import Path
import matplotlib
matplotlib.use("Agg")  # 没有桌面显示器时也能生成PNG文件。
import matplotlib.pyplot as plt
from matplotlib import font_manager
import numpy as np
from calculus import evaluate


def _chinese_font():
    installed = {item.name for item in font_manager.fontManager.ttflist}
    for font in ("Noto Sans CJK SC", "Microsoft YaHei", "SimHei",
                 "PingFang SC", "WenQuanYi Micro Hei"):
        if font in installed:
            plt.rcParams["font.sans-serif"] = [font, "DejaVu Sans"]
            plt.rcParams["axes.unicode_minus"] = False
            return
    print("提示：未找到中文字体，图片可能出现缺字；参照README安装Noto Sans CJK字体。")


def save_motion_charts(time_s, speed_mps, folder):
    """从真实数值结果绘图，并在每张图标清物理量和单位。"""
    _chinese_font()
    data = evaluate(time_s, speed_mps)
    root = Path(folder)
    root.mkdir(parents=True, exist_ok=True)
    paths = []
    items = [
        ("speed_time.png", "速度随时间变化", "速度（m/s）",
         data["time_s"], data["speed_mps"]),
        ("displacement_time.png", "梯形积分得到的累计位移", "累计位移（m）",
         data["time_s"], data["trapezoid_m"]),
        ("acceleration_time.png", "相邻速度差分得到的加速度", "区间加速度（m/s²）",
         data["accel_mid_s"], data["accel_mps2"]),
    ]
    for filename, title, ylabel, x, y in items:
        fig, ax = plt.subplots(figsize=(8, 4.7), dpi=145)
        ax.plot(x, y, marker="o", linewidth=1.9, markersize=3.3)
        ax.set_xlabel("时间（s）")
        ax.set_ylabel(ylabel)
        ax.set_title(title)
        ax.grid(True, alpha=0.25)
        fig.tight_layout()
        target = root / filename
        fig.savefig(target, dpi=220)
        plt.close(fig)
        paths.append(target)
    return paths
