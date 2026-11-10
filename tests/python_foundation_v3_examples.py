"""真实Python校核V3逐符号教程：144项语法完整性、解析与可执行样例。

它验证课程参考代码，不代表学员本人本地已经通关。
"""
import ast
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOK = json.loads((ROOT / "python-foundation-v3-content.json").read_text(encoding="utf-8"))
PROJECT = ROOT / "python-foundation-project"


def manual_sample(code: str) -> bool:
    meaningful = [s.strip() for s in code.splitlines()
                  if s.strip() and not s.strip().startswith("#")]
    if not meaningful:
        return True
    skip = ("input(", "import numpy", "from matplotlib",
            "Path(__file__)", "__file__", "## logic.py", "## main.py")
    return any(x in code for x in skip)


def main() -> None:
    lessons = BOOK["chapters"]
    assert len(lessons) == 23
    assert len({c["id"] for c in lessons}) == 23
    assert sum(len(c["details"]) for c in lessons) == 144
    assert lessons[1]["id"] == "v2_02"
    assert lessons[7]["id"] == "v2_08"
    assert "for" in lessons[7]["title"] and "while" in lessons[7]["title"]
    assert lessons[8]["id"] == "v3_iteration_tools"
    assert [c["id"] for c in lessons if c["id"].startswith("v2_")]
    assert len([c for c in lessons if c["id"].startswith("v2_")]) == 21
    executed = checked = skipped = parsed = 0
    failures = []
    with tempfile.TemporaryDirectory() as root:
        for chapter in lessons:
            for item in chapter["details"]:
                label = chapter["id"] + " / " + item["name"]
                for key in ("name", "grammar", "explanation", "example",
                            "trace", "expected", "errors", "practice"):
                    assert item.get(key), (label, key)
                assert len(item["explanation"]) >= 70, label
                assert len(item["trace"]) >= 2, label
                source = item["example"]
                try:
                    ast.parse(source, filename=label)
                    parsed += 1
                except SyntaxError as exc:
                    failures.append(f"{label}: syntax error {exc}")
                    continue
                if manual_sample(source):
                    skipped += 1
                    continue
                env = os.environ.copy()
                env["PYTHONPATH"] = str(PROJECT)
                process = subprocess.run([sys.executable, "-c", source],
                                         cwd=root, env=env, capture_output=True,
                                         text=True, timeout=8)
                if process.returncode:
                    failures.append(f"{label}: execution failed {process.stderr[-600:]}")
                    continue
                executed += 1
                expected = item["expected"].strip()
                vague = ("应", "本地", "依文件", "例如", "通常", "测试", "（",
                         "状态", "输出依赖", "具体", "参考", "程序", "输出", "仅", "格式")
                if expected and len(expected) < 230 and not any(x in expected for x in vague):
                    checked += 1
                    actual = process.stdout.strip()
                    if actual != expected:
                        failures.append(f"{label}: expected={expected!r}, actual={actual!r}")
    print(f"parsed={parsed}, real_python_executed={executed}, "
          f"exact_outputs_compared={checked}, manual_or_external={skipped}")
    if failures:
        print("\n".join(failures[:30]), file=sys.stderr)
        raise SystemExit(f"V3 examples failed: {len(failures)}")
    assert parsed == 144
    assert executed >= 85


if __name__ == "__main__":
    main()
