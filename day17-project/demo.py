"""D17命令行入口：选择案例、计算结果、保存三张真正的Matplotlib图片。

示例：
    python demo.py --scenario 0 --out charts
    python -m unittest -v test_calculus
"""
import argparse
import json
from pathlib import Path

from plot_motion import save_motion_charts
from scenarios import run_scenario


def main() -> int:
    parser = argparse.ArgumentParser(description="D17微积分与离散时间：积分/差分")
    parser.add_argument("--scenario", type=int, choices=range(8), default=0,
                        help="0/1恒速dt，2/3线性速度dt，4/5噪声差分，6不等间隔，7无效时间戳")
    parser.add_argument("--out", default="charts", help="保存三张中文PNG的目录")
    args = parser.parse_args()

    # 根据场景编号构造离线数据，并调用calculus.py进行计算。
    result = run_scenario(args.scenario)
    print(f"scenario={args.scenario} status={result['status']} valid={result['valid']}")
    if not result["valid"]:
        # 时间戳无效时明确返回错误，不制造看起来有效的位移曲线。
        print("diagnostic_json=" + json.dumps(result, ensure_ascii=False))
        return 2

    # 把Python浮点数结果打印给操作者，便于逐项核对手算。
    print("result_json=" + json.dumps(result, ensure_ascii=False))
    pngs = save_motion_charts(result["time_s"], result["speed_mps"], Path(args.out))
    for file in pngs:
        print("chart=" + str(file))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
