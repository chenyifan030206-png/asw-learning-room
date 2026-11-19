"""D16运行入口：按场景编号，调用数学模块，再决定是否保存坐标图。

运行方式：
    python demo.py --scenario 0 --out charts
    python -m unittest -v test_geometry
网页只用JS展示参考数值；本文件必须由本地Python实际执行。
"""
import argparse
import json
from pathlib import Path

from plot_frames import save_frame_plot
from scenarios import run_scenario


def main() -> int:
    parser = argparse.ArgumentParser(description="D16 NumPy二维旋转和车体/世界坐标")
    parser.add_argument("--scenario", type=int, choices=range(7), default=0,
                        help="0旋转，1平移，2顺序，3角度故障，4逆变换，5NaN，6多点")
    parser.add_argument("--out", default="charts", help="输出坐标PNG的目录")
    args = parser.parse_args()

    # 这里才真正开始算坐标。main先等待run_scenario返回结果字典；
    # 场景函数内部再调用geometry2d.py。import本身不会执行这些案例。
    result = run_scenario(args.scenario)
    print(f"scenario={args.scenario} status={result['status']} valid={result['valid']}")
    if not result["valid"]:
        print(f"error_kind={result['error_kind']}")
        print(result["diagnostic"])
        # status和valid要一起看。角度错误或NaN时不能拿诊断里的错误点绘图；
        # 返回2是向命令行说明本次案例按正常坐标计算的路径未成功。
        print("diagnostic_json=" + json.dumps(result, ensure_ascii=False))
        return 2

    print("result_json=" + json.dumps(result, ensure_ascii=False))
    print(f"roundtrip_error_m={result.get('roundtrip_error_m', 'n/a')}")
    # 只有成功的五个场景才会走到绘图模块。
    # 这里的角度和位移与scenarios.py所用的教学数据一一对应。
    if args.scenario in (0, 1, 2, 4, 6):
        if args.scenario == 0:
            angle, tx, ty = 90.0, 0.0, 0.0
        elif args.scenario == 2:
            angle, tx, ty = 90.0, 2.0, 0.0
        elif args.scenario == 4:
            angle, tx, ty = 30.0, 10.0, 5.0
        else:
            angle, tx, ty = 90.0, 10.0, 5.0
        saved = save_frame_plot(angle, tx, ty, Path(args.out))
        print("chart=" + str(saved))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
