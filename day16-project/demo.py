"""D16可直接运行入口：场景→二维坐标运算→诊断→保存可视化。

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

    result = run_scenario(args.scenario)  # scenarios.py调用geometry2d.py。
    print(f"scenario={args.scenario} status={result['status']} valid={result['valid']}")
    if not result["valid"]:
        print(f"error_kind={result['error_kind']}")
        print(result["diagnostic"])
        # 故障场景仍返回完整诊断，但不提供可消费的世界坐标或PNG。
        print("diagnostic_json=" + json.dumps(result, ensure_ascii=False))
        return 2

    print("result_json=" + json.dumps(result, ensure_ascii=False))
    print(f"roundtrip_error_m={result.get('roundtrip_error_m', 'n/a')}")
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
