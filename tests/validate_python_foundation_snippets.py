"""对零基础教材的独立代码片段进行真实Python语法和执行校核。

只跳过明确需要用户键盘、第三方NumPy/Matplotlib、文件分段示例和非代码说明。
一切会被运行的代码均使用Python 3.11在隔离临时目录执行，不触碰学习者文件。
"""
from __future__ import annotations

import ast
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOK = json.loads((ROOT / "python-foundation-content.json").read_text(encoding="utf-8"))
PROJECT = ROOT / "python-foundation-project"


def needs_manual_demo(code: str) -> bool:
    meaningful = [line.strip() for line in code.splitlines()
                  if line.strip() and not line.strip().startswith("#")]
    if not meaningful:
        return True
    markers = (
        "input(", "import numpy", "from matplotlib",
        "Path(__file__)", "__file__", "## logic.py", "## main.py",
    )
    if any(x in code for x in markers):
        return True
    # markdown-like sample describing how to create multiple files is a teaching note,
    # not a runnable single-source script.
    if "##" in code and ("logic.py" in code or "main.py" in code):
        return True
    return False


def main() -> None:
    passed = 0
    skipped = 0
    syntax_passed = 0
    examples_checked = 0
    failures = []
    with tempfile.TemporaryDirectory() as tmp:
        for chapter in BOOK["chapters"]:
            for n, topic in enumerate(chapter["deepDive"], start=1):
                code = topic["code"]
                label = f"{chapter['id']} / {n} {topic['title']}"
                try:
                    ast.parse(code, filename=label)
                    syntax_passed += 1
                except SyntaxError as exc:
                    failures.append(f"SYNTAX {label}: {exc}")
                    continue
                if needs_manual_demo(code):
                    skipped += 1
                    continue
                env = os.environ.copy()
                env["PYTHONPATH"] = str(PROJECT)
                result = subprocess.run([sys.executable, "-c", code],
                                        cwd=tmp, env=env,
                                        capture_output=True, text=True,
                                        timeout=8)
                if result.returncode != 0:
                    failures.append(
                        f"EXEC {label}: exit={result.returncode}\n{result.stderr[-1200:]}"
                    )
                    continue
                passed += 1
                # Only strict-compare outputs with no prose and modest size.
                expected = topic["output"].strip()
                if expected and len(expected) < 250 and not any(
                    hint in expected for hint in
                    ["应", "需要", "取决于", "例如", "具体", "依文件", "通常",
                     "本地", "有些", "测试", "输出依赖", "（", "状态", "正常",
                     "程序", "退出码", "格式", "仅", "实际"]
                ):
                    examples_checked += 1
                    actual = result.stdout.strip()
                    if actual != expected:
                        failures.append(
                            f"OUTPUT {label}: expected={expected!r} actual={actual!r}"
                        )
    print(f"Syntax parsed: {syntax_passed}; snippets executed: {passed}; "
          f"manual/environment samples: {skipped}; exact output checked: {examples_checked}")
    if failures:
        print("\n".join(failures[:30]), file=sys.stderr)
        raise SystemExit(f"{len(failures)} Python snippets did not validate")
    assert syntax_passed >= 140, syntax_passed
    assert passed >= 85, passed


if __name__ == "__main__":
    main()
