"""D16绘图：以世界系x/y展示车辆坐标轴方向及离线地标点。"""
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # CI/WSL无GUI环境可保存PNG。
import matplotlib.pyplot as plt
from matplotlib import font_manager
import numpy as np

from geometry2d import rigid_transform_deg, transform_points
from scenarios import LANDMARKS_V


def _font():
    """按存在的CJK字体设定中文；缺字体时提醒使用README安装Noto字体。"""
    installed = {f.name for f in font_manager.fontManager.ttflist}
    for name in ("Noto Sans CJK SC", "Microsoft YaHei", "SimHei", "PingFang SC",
                 "WenQuanYi Micro Hei"):
        if name in installed:
            plt.rcParams["font.sans-serif"] = [name, "DejaVu Sans"]
            plt.rcParams["axes.unicode_minus"] = False
            return name
    print("提示：未检测到中文字体，图形可保存但中文可能缺字；见README安装Noto Sans CJK。")
    return None


def save_frame_plot(angle_deg: float, tx_m: float, ty_m: float,
                    output_dir: str | Path) -> Path:
    """独立保存一张世界/车体坐标及地标图；所有坐标单位为米。"""
    _font()
    transform = rigid_transform_deg(angle_deg, tx_m, ty_m)
    points_world = transform_points(transform, LANDMARKS_V)
    origin_vehicle_world = transform[:2, 2]
    rotation = transform[:2, :2]

    fig, ax = plt.subplots(figsize=(8.3, 7.0), dpi=140)
    ax.axhline(0.0, color="0.8", linewidth=0.9)
    ax.axvline(0.0, color="0.8", linewidth=0.9)
    ax.quiver(0, 0, 1, 0, angles="xy", scale_units="xy", scale=1,
              color="#42638c", width=0.006)
    ax.quiver(0, 0, 0, 1, angles="xy", scale_units="xy", scale=1,
              color="#42638c", width=0.006)
    ax.annotate("世界系 x_W", (1.08, 0.03), fontsize=10, color="#42638c")
    ax.annotate("世界系 y_W", (0.05, 1.06), fontsize=10, color="#42638c")
    x_axis = rotation @ np.array([1.0, 0.0])
    y_axis = rotation @ np.array([0.0, 1.0])
    ax.quiver(*origin_vehicle_world, *x_axis, angles="xy", scale_units="xy",
              scale=1, color="#d07a32", width=0.007)
    ax.quiver(*origin_vehicle_world, *y_axis, angles="xy", scale_units="xy",
              scale=1, color="#32877a", width=0.007)
    ax.annotate("车体 x_V", origin_vehicle_world + x_axis*1.12, fontsize=11,
                color="#d07a32")
    ax.annotate("车体 y_V", origin_vehicle_world + y_axis*1.12, fontsize=11,
                color="#32877a")
    ax.scatter(points_world[:, 0], points_world[:, 1],
               marker="o", s=43, color="#893f74", label="地标点（世界坐标）")
    for i, point in enumerate(points_world):
        ax.annotate(f"P{i}", (point[0]+0.12, point[1]+0.12), fontsize=9)
    ax.scatter([origin_vehicle_world[0]], [origin_vehicle_world[1]],
               marker="s", s=55, color="#c46324", label="车体原点 O_V")
    ax.scatter([0.0], [0.0], marker="+", s=65, color="#345878", label="世界原点 O_W")
    ax.set_xlabel("世界坐标 x_W（m）")
    ax.set_ylabel("世界坐标 y_W（m）")
    ax.set_title(f"二维车体—世界坐标变换 | 航向角 {angle_deg:g}°")
    ax.axis("equal")  # 等比例坐标，不让90°在画面上看起来像斜角。
    ax.grid(alpha=0.22)
    ax.legend(loc="best", fontsize=9)
    fig.tight_layout()
    path = Path(output_dir) / "coordinate_frames.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=220)
    plt.close(fig)
    return path
