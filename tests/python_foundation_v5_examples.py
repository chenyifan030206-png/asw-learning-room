"""V5第15–23章真实Python执行校核：不以仅有代码文本代替运行。"""
from __future__ import annotations

import ast
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
base = json.loads((ROOT / "python-foundation-v5-content.json").read_text(encoding="utf-8"))
previous = json.loads((ROOT / "python-foundation-v4-content.json").read_text(encoding="utf-8"))
assert len(base["chapters"]) == 23
assert base["chapters"][:14] == previous["chapters"][:14], "第01–14章内容必须原样继承"
assert sum(len(c["details"]) for c in base["chapters"]) == 156
assert base["chapters"][14]["id"] == "v2_13"
assert base["chapters"][22]["id"] == "v2_21"

def execute(cmd: list[str], cwd: Path) -> tuple[str, str, int]:
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=14,
        env={**os.environ, "PYTHONIOENCODING": "utf-8"}
    )
    return result.stdout.replace("\r\n", "\n").rstrip("\n"), result.stderr, result.returncode

total = parsed = executed = checked = skip = multifile = 0
for number in range(15, 24):
    data = json.loads((ROOT / f"python-foundation-v5-deep-{number}.json").read_text(encoding="utf-8"))
    chapter = base["chapters"][number - 1]
    assert data["chapterId"] == chapter["id"]
    assert len(data["lessons"]) >= 6
    for idx, lesson in enumerate(data["lessons"], start=1):
        label = f"第{number}章第{idx}节 {lesson['title']}"
        total += 1
        assert all(lesson.get(k) for k in (
            "title", "why", "syntax", "tokens", "code", "steps",
            "output", "mistakes", "exercise")), label
        assert len(lesson["tokens"]) >= 3, label
        assert len(lesson["steps"]) >= 3, label
        assert len(lesson["mistakes"]) >= 1, label
        ast.parse(lesson["code"], filename=label)
        parsed += 1
        kind = lesson.get("kind", "run")
        if kind == "noexec":
            skip += 1
            continue
        with tempfile.TemporaryDirectory(prefix="v5_") as folder:
            root = Path(folder)
            if kind == "multifile":
                multifile += 1
                for source in lesson["files"]:
                    ast.parse(source["code"], filename=source["name"])
                    (root / source["name"]).write_text(source["code"], encoding="utf-8")
                command = lesson["command"]
                outputs = []
                for part in command.split("&&"):
                    words = part.strip().split()
                    assert words[0] == "python" and len(words) == 2
                    stdout, stderr, status = execute([sys.executable, words[1]], root)
                    assert status == 0, (label, stderr)
                    outputs.append(stdout)
                stdout = "\n".join(outputs)
            else:
                path = root / "example.py"
                path.write_text(lesson["code"], encoding="utf-8")
                stdout, stderr, status = execute([sys.executable, str(path)], root)
                assert status == 0, (label, stderr)
            executed += 1
            if kind != "run_variable_output":
                expected = lesson["output"].replace("\r\n", "\n").rstrip("\n")
                assert stdout == expected, (
                    f"输出不匹配：{label}\n期望：{expected!r}\n实际：{stdout!r}"
                )
                checked += 1

assert total == 84, (total, "课题缺失")
assert executed >= 67, (executed, "可运行示例比例过低")
assert checked >= 60, (checked, "自动精确对账不足")
print(
    f"V5 PASS: chapters=9, lessons={total}, parsed={parsed}, "
    f"executed={executed}, exact_output_verified={checked}, "
    f"multi_file={multifile}, explanation_only={skip}"
)
