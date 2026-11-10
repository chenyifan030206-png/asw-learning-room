"""真正运行新版Python语法最小示例，并检查教材每个讲解模块完整性。

网页本身不会执行Python；GitHub Actions执行的是课程提供的真实Python代码。
"""
from __future__ import annotations

import ast
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "python-foundation-v2-content.json"


def main() -> None:
    data = json.loads(BOOK.read_text(encoding="utf-8"))
    lessons = data["chapters"]
    assert len(lessons) == 21
    assert len({chapter["id"] for chapter in lessons}) == 21
    assert all(chapter["id"].startswith("v2_") for chapter in lessons)
    assert len(lessons[1]["details"]) >= 10
    assert len(lessons[7]["details"]) >= 10
    assert "for" in lessons[7]["title"] and "while" in lessons[7]["title"]
    all_details = [(chapter, item) for chapter in lessons for item in chapter["details"]]
    assert len(all_details) >= 100, len(all_details)
    assert all(len(ch["story"]) >= 2 for ch in lessons)
    asserted = 0
    skipped = []
    mismatch = []
    for chapter, item in all_details:
        for key in ("name", "grammar", "explanation", "parts", "example",
                    "trace", "expected", "errors", "practice"):
            assert item.get(key), (chapter["id"], item["name"], key)
        assert len(item["parts"]) >= 3, (chapter["id"], item["name"])
        assert len(item["trace"]) >= 2, (chapter["id"], item["name"])
        assert len(item["explanation"]) >= 50, (chapter["id"], item["name"])
        source = item["example"]
        try:
            ast.parse(source, filename=chapter["id"] + "_" + item["name"])
        except SyntaxError as exc:
            raise AssertionError(f"样例语法有误 {chapter['id']} {item['name']}: {exc}") from exc
        expected = item["expected"].strip()
        # 明确说明输出依赖环境的示例，不对其做逐字比较；仍校验语法。
        if any(w in expected for w in ("（", "根据环境", "运行测试", "在当前目录")) or "__file__" in source:
            skipped.append((chapter["id"], item["name"]))
            continue
        with tempfile.TemporaryDirectory() as folder:
            p = subprocess.run([sys.executable, "-c", source], cwd=folder,
                               text=True, capture_output=True, timeout=5)
        actual = p.stdout.strip()
        if p.returncode != 0 or actual != expected:
            mismatch.append((chapter["id"], item["name"],
                             f"expected={expected!r} actual={actual!r} stderr={p.stderr[-300:]!r}"))
        else:
            asserted += 1

    assert not mismatch, "\n".join(str(x) for x in mismatch)
    assert asserted >= 90, f"可执行的语法实例不足：{asserted}, skipped={skipped}"
    print(f"PASS: {len(lessons)}章，{len(all_details)}个语法知识点，"
          f"{asserted}段真实Python完整执行输出匹配，{len(skipped)}段仅结构验证")
    print("Explicit environment-dependent examples:", skipped)


if __name__ == "__main__":
    main()
