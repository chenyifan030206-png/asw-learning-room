"""程序入口：理解Python多文件调用顺序的最好入口文件。"""
import argparse
import json
from dataclasses import asdict
from pathlib import Path

from monitor import Monitor         # main.py调用业务逻辑所在模块。
from reader import load_frames      # main.py调用CSV解析所在模块。


def run(input_file: Path, output_file: Path) -> list[dict]:
    """入口协调函数：读数据→逐帧处理→生成可检查的JSON。"""
    frames = load_frames(input_file)  # 第1步：reader.py返回list[Frame]。
    monitor = Monitor()               # 第2步：创建唯一Monitor对象，保留跨帧状态。
    results: list[dict] = []          # 第3步：为所有处理结果准备一个空列表。

    for frame in frames:              # 每次循环处理一帧，不重新创建monitor。
        now_ms = frame.time_ms + 20   # 离线模拟“采样后20ms处理”；不是实时调度。
        decision = monitor.step(frame, now_ms)  # monitor.py处理并返回Decision。
        result = asdict(decision)     # 将dataclass对象转换成普通dict便于JSON保存。
        results.append(result)        # 保留当前帧的输出，不覆盖前面各帧。
        print(f"t={frame.time_ms:3d}ms "
              f"distance={frame.distance_m:5.1f}m "
              f"status={decision.status:7s} "
              f"valid={int(decision.valid)} alert={int(decision.alert)}")

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("w", encoding="utf-8") as file:
        json.dump(results, file, ensure_ascii=False, indent=2)
    return results  # 返回列表，让调用者或测试继续检查结果。


def main() -> int:
    """命令行入口：用参数替代把文件路径写死在业务函数里。"""
    parser = argparse.ArgumentParser(description="Python零基础·ASW日志监视器")
    parser.add_argument("--input", default="sample.csv", help="输入CSV文件路径")
    parser.add_argument("--output", default="output/results.json", help="输出JSON路径")
    args = parser.parse_args()

    try:
        results = run(Path(args.input), Path(args.output))
    except (OSError, ValueError) as exc:
        print(f"解析失败：{exc}")  # 不把失败数据伪装为正常输出。
        return 2
    print(f"完成：{len(results)}帧，结果保存到 {args.output}")
    return 0


if __name__ == "__main__":
    # import main时不会自动执行；python main.py时进入这里。
    raise SystemExit(main())  # 0正常退出；2表示输入错误。
