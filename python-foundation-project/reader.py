"""日志解析模块：读取CSV文本，报告原始行号，不静默删除异常帧。"""
import csv
import math
from pathlib import Path

from models import Frame  # import时只取得类定义，不会自动运行main.py。

COLUMNS = ("time_ms", "speed_kmh", "distance_m", "radar_valid", "enable")


def parse_flag(text: str, line: int, name: str) -> bool:
    """把CSV中的'0'/'1'转换成真正的bool，其他字符串必须报错。"""
    value = text.strip()
    if value not in ("0", "1"):
        raise ValueError(f"第{line}行 {name}必须是0或1，收到{value!r}")
    return value == "1"


def load_frames(path: str | Path) -> list[Frame]:
    """返回帧列表；任何一个字段错误都报告原CSV所在行号。"""
    frames: list[Frame] = []  # 空列表：准备存放多条Frame结构化对象。
    with Path(path).open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)  # 用表头作为字典键来读取每行数据。
        if tuple(reader.fieldnames or ()) != COLUMNS:
            raise ValueError("第1行表头不正确：必须是"+",".join(COLUMNS))

        previous_time: int | None = None
        for row in reader:  # 每轮循环取得一行字典，如row['speed_kmh']。
            line = reader.line_num  # CSV当前物理行，首个数据行通常为第2行。
            try:
                if None in row or any(row.get(key) is None for key in COLUMNS):
                    raise ValueError("数据列数量不正确")
                if any(not row[key].strip() for key in COLUMNS):
                    raise ValueError("存在空字段，不能直接当作0")
                time_ms = int(row["time_ms"])
                speed_kmh = float(row["speed_kmh"])
                distance_m = float(row["distance_m"])
                radar_valid = parse_flag(row["radar_valid"], line, "radar_valid")
                enable = parse_flag(row["enable"], line, "enable")
            except (ValueError, TypeError) as exc:
                raise ValueError(f"第{line}行解析失败：{exc}") from exc

            # 数据物理含义的检查与字符串转数字是不同步骤。
            if time_ms < 0 or (previous_time is not None and time_ms <= previous_time):
                raise ValueError(f"第{line}行时间戳必须严格递增且不为负")
            if not math.isfinite(speed_kmh) or not 0 <= speed_kmh <= 250:
                raise ValueError(f"第{line}行speed_kmh不是0～250范围内的有限数")
            if not math.isfinite(distance_m) or not 0 <= distance_m <= 500:
                raise ValueError(f"第{line}行distance_m不是0～500范围内的有限数")

            frames.append(Frame(time_ms, speed_kmh, distance_m, radar_valid, enable))
            previous_time = time_ms

    if not frames:
        raise ValueError("只有表头而没有有效数据行")
    return frames
