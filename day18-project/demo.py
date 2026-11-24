"""运行：python demo.py --scenario 0 --out charts"""
import argparse
import json
from pathlib import Path
import matplotlib
# use("Agg")选择无需桌面窗口、能保存图片的后端，须在导入pyplot前设置。
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
import numpy as np
from scenarios import run_scenario


def save_charts(result, out):
    # fontManager.ttflist是已知字体对象列表；集合推导式取每个字体的名称。
    fonts = {f.name for f in font_manager.fontManager.ttflist}
    for name in ("Noto Sans CJK SC", "Microsoft YaHei", "SimHei", "PingFang SC"):
        if name in fonts:
            # rcParams是Matplotlib全局绘图设置字典。
            plt.rcParams["font.sans-serif"] = [name, "DejaVu Sans"]
            plt.rcParams["axes.unicode_minus"] = False
            break
    # Path代表文件路径；mkdir(parents=True, exist_ok=True)创建目录并允许已存在。
    root = Path(out)
    root.mkdir(parents=True, exist_ok=True)
    for a, b, title, ylabel, filename in [
        ("raw", "filtered", "固定种子速度测量与滤波", "速度 (m/s)", "noise.png"),
        ("step", "response", "无噪声单位阶跃响应", "归一化幅值", "step.png"),
    ]:
        # arange(N)生成0..N-1；乘dt得到实际时间轴。
        t = np.arange(len(result[a])) * result["dt_s"]
        # subplots返回Figure和Axes；plot按(x,y)画曲线，label供图例使用。
        fig, ax = plt.subplots(figsize=(8, 4.5))
        ax.plot(t, result[a], label="输入")
        ax.plot(t, result[b], label="滤波输出")
        # set_xlabel/ylabel/title设置文字；legend显示图例；grid绘制网格。
        ax.set_xlabel("时间 (s)")
        ax.set_ylabel(ylabel)
        ax.set_title(title)
        ax.legend()
        ax.grid(alpha=0.25)
        # tight_layout调整留白；savefig写PNG；close释放此图。
        fig.tight_layout()
        fig.savefig(root / filename, dpi=180)
        plt.close(fig)


def main():
    # ArgumentParser创建命令行解析器；add_argument声明参数及默认值。
    parser = argparse.ArgumentParser(description="D18概率与低通滤波")
    parser.add_argument("--scenario", type=int, choices=range(7), default=0)
    parser.add_argument("--out", default="charts")
    # parse_args解析命令行，返回Namespace，可用args.scenario访问。
    args = parser.parse_args()
    result = run_scenario(args.scenario)
    # json.dumps把字典转换为JSON文本；ensure_ascii=False保留中文。
    print("result_json=" + json.dumps(result, ensure_ascii=False))
    if not result["valid"]:
        return 2
    save_charts(result, args.out)
    return 0


if __name__ == "__main__":
    # SystemExit是退出异常；把main返回值作为进程退出码。
    raise SystemExit(main())
