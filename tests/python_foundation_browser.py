"""新增Python零基础页浏览器回归：源码读写、笔记保存、ZIP完整性与原课程入口。"""
from __future__ import annotations

import json
import zipfile
from io import BytesIO
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = "http://127.0.0.1:8765/python-foundation.html"


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 920}, accept_downloads=True)
        issues = []
        page.on("pageerror", lambda error: issues.append(str(error)))
        page.goto(URL, wait_until="networkidle")
        page.locator("#chapterNav button[data-chapter]").first.wait_for()

        # 20章节和对照表是网站实际呈现，不只检查JSON文件中的声明。
        assert page.locator("#chapterNav button[data-chapter]").count() == 20
        assert "01 · Python到底如何运行" in page.locator("#chapterPanel").inner_text()

        # 保存本章笔记，然后离开再回来必须保持一致。
        page.locator("#chapterNote").fill("我理解了main()的入口以及函数调用与定义的区别。")
        page.locator("#chapterNav button[data-chapter]").nth(1).click()
        page.locator("#chapterNote").fill("venv是项目隔离的依赖环境。")
        page.locator("#chapterNav button[data-chapter]").first.click()
        assert "我理解了main()" in page.locator("#chapterNote").input_value()

        # 刷新后依然保留，且不会自动给原D15标记完成。
        page.reload(wait_until="networkidle")
        page.locator("#chapterNav button[data-chapter]").first.wait_for()
        assert "我理解了main()" in page.locator("#chapterNote").input_value()
        local_stored = page.evaluate("localStorage.getItem('asw-python-foundation-v1:' + location.pathname)")
        assert local_stored and json.loads(local_stored)["notes"]["start"].startswith("我理解了")
        original_db = page.evaluate("localStorage.getItem('asw-pages-v1:' + location.pathname)")
        assert original_db is None, "独立导学页不能擅自写原D15学习记录"

        # 逐章理解检测、掌握标记和笔记导出。
        page.get_by_role("button", name="标记本章已完成").click()
        assert "1 / 20" in page.locator("#progressLine").inner_text()
        with page.expect_download() as info:
            page.get_by_role("button", name="导出学习笔记 JSON").click()
        notes = info.value
        payload = json.loads(Path(notes.path()).read_text(encoding="utf-8"))
        assert payload["app"] == "asw-python-foundation"
        assert payload["data"]["notes"]["start"].startswith("我理解了")

        page.get_by_role("button", name="C语言 → Python 对照表").click()
        assert not page.locator("#bridgePanel").is_hidden()
        assert page.locator("#bridgeTable tbody tr").count() >= 20

        page.get_by_role("button", name="全部语法索引").click()
        assert page.locator("#atlasTable tbody tr").count() >= 20
        page.locator("#atlasSearch").fill("async")
        assert page.locator("#atlasTable tbody tr").count() >= 1

        page.get_by_role("button", name="完整工程与执行链").click()
        assert page.locator("#fileNav button").count() == 9
        page.locator("#fileNav button[data-file='main.py']").click()
        assert "def main()" in page.locator("#fileCode").inner_text()
        page.locator("#fileNote").fill("这里的main()负责解析命令行，再调用run()。")
        page.locator("#fileNav button[data-file='monitor.py']").click()
        page.locator("#fileNav button[data-file='main.py']").click()
        assert "main()负责解析命令行" in page.locator("#fileNote").input_value()

        # 下载完整ZIP，在本地实际用Python标准库zipfile读取并逐文件核对。
        with page.expect_download() as info:
            page.get_by_role("button", name="下载完整练习工程 ZIP").click()
        archive = zipfile.ZipFile(BytesIO(Path(info.value.path()).read_bytes()))
        names = archive.namelist()
        assert len(names) == 9, names
        assert all(name.startswith("python-foundation-project/") for name in names)
        assert b"def main()" in archive.read("python-foundation-project/main.py")
        assert b"class Monitor:" in archive.read("python-foundation-project/monitor.py")
        assert archive.testzip() is None, "ZIP CRC校验失败"
        print("desktop ZIP and annotations:", names)

        page.get_by_role("button", name="参考资料与视频").click()
        assert page.locator("#resourcesList .resource").count() >= 10
        page.screenshot(path=str(ROOT / "python-foundation-test-desktop.png"), full_page=True)
        assert not issues, issues
        page.close()

        # 移动端尺寸覆盖：页面必须可浏览、章节/正文可读，不能有全页水平溢出。
        mobile = browser.new_page(viewport={"width": 390, "height": 844})
        mobile.goto(URL, wait_until="networkidle")
        mobile.locator("#chapterNav button[data-chapter]").first.wait_for()
        assert mobile.locator("#chapterPanel").is_visible()
        overflow = mobile.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert overflow <= 2, f"手机端横向溢出 {overflow}px"
        mobile.screenshot(path=str(ROOT / "python-foundation-test-mobile.png"), full_page=True)
        mobile.close()
        browser.close()
    print("PASS: foundation browser navigation, notes, ZIP, resources and mobile")


if __name__ == "__main__":
    main()
