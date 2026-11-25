"""命令行入口和图像输出，不负责估计器内部数学。"""
import argparse
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")  # 指定可在无图形界面的环境中保存PNG的后端。
import matplotlib.pyplot as plt
from matplotlib import font_manager
from scenarios import run_scenario


def save_charts(r, out):
    fonts = {f.name for f in font_manager.fontManager.ttflist}
    for name in ("Noto Sans CJK SC", "Microsoft YaHei", "SimHei", "PingFang SC"):
        if name in fonts:
            plt.rcParams["font.sans-serif"] = [name, "DejaVu Sans"]
            plt.rcParams["axes.unicode_minus"] = False
            break
    root = Path(out)
    root.mkdir(parents=True, exist_ok=True)
    # subplots创建Figure和Axes；plot(x,y)画线；None在测量曲线中形成断点。
    for truth, estimate, title, unit, filename in [
        ("truth_p", "p", "位置估计", "位置 (m)", "position.png"),
        ("truth_v", "v", "速度估计", "速度 (m/s)", "velocity.png"),
    ]:
        fig, ax = plt.subplots(figsize=(8, 4.5))
        ax.plot(r["t"], r[truth], label="教学真值")
        if estimate == "p":
            ax.plot(r["t"], r["z"], ".", label="位置测量", alpha=.45)
        ax.plot(r["t"], r[estimate], label="估计值")
        ax.set_xlabel("时间 (s)")
        ax.set_ylabel(unit)
        ax.set_title(title)
        ax.legend()
        ax.grid(alpha=.25)
        fig.tight_layout()
        fig.savefig(root / filename, dpi=180)
        plt.close(fig)
    # 两个P对角量单位不同，分两个子图，不将其直接求和或共用纵轴。
    fig, axes = plt.subplots(2, 1, figsize=(8, 6))
    for ax, key, unit in [(axes[0], "pp", "位置方差 (m²)"),
                          (axes[1], "pv", "速度方差 ((m/s)²)")]:
        ax.plot(r["t"], r[key])
        ax.set_xlabel("时间 (s)")
        ax.set_ylabel(unit)
        ax.grid(alpha=.25)
    fig.tight_layout()
    fig.savefig(root / "covariance.png", dpi=180)
    plt.close(fig)


def main():
    # argparse创建命令行解析器；parse_args返回带命名属性的Namespace。
    parser = argparse.ArgumentParser(description="D19一维卡尔曼滤波")
    parser.add_argument("--scenario", type=int, choices=range(7), default=0)
    parser.add_argument("--out", default="charts")
    args = parser.parse_args()
    r = run_scenario(args.scenario)
    # json.dumps将字典转为JSON文本，None转为null。
    print("result_json=" + json.dumps(r, ensure_ascii=False, allow_nan=False))
    if not r["valid"]:
        return 2
    save_charts(r, args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
