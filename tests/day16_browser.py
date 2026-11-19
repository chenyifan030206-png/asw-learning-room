"""D16 GitHub Pages真实Chromium功能验收（浏览器只执行JS模拟）。"""
import json
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

PAGE = "http://127.0.0.1:8765/index.html"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1330, "height": 930},
                                accept_downloads=True)
        js_errors = []
        page.on("pageerror", lambda error: js_errors.append(str(error)))
        # D01–D15均已完成浏览器课程才允许打开D16；模拟已知学习进度。
        page.add_init_script("""(() => {
          const db = {notes:[{day:15,notes:'D15浏览器通过且个人注释保留',
             feedback:'',updated:'2026-11-19T00:00:00Z',
             annotations:'[]',file_notes:'{}'}],
             progress:Array.from({length:15},(_,i)=>({day:i+1,method:'test',
               detail:'在线练习',updated:'2026-11-19T00:00:00Z'})),
             runs:[], attempts:[]};
          // 只在首次打开本测试页面时初始化；刷新不得覆盖真实保存的D16笔记。
          if(!localStorage.getItem('asw-pages-v1:/'))
            localStorage.setItem('asw-pages-v1:/',JSON.stringify(db));
        })()""")
        page.goto(PAGE, wait_until="networkidle")
        page.wait_for_function("document.querySelector('#courseStatus')?.textContent.includes('D16')")
        assert "线性代数与坐标系" in page.locator("#courseTitle").inner_text() if page.locator("#courseTitle").count() else             "线性代数与坐标系" in page.locator("body").inner_text()
        # 新页面先讲理论再讲代码：真正按DOM位置和可见图数验收。
        assert page.locator("#reading .d16-concept").count() == 14
        assert page.locator("#reading .d16-figure svg").count() == 14
        assert page.locator("#reading [data-diagram='frames']").count() == 2
        assert page.locator("#reading .d16-chapter-links a").count() == 14
        assert page.evaluate("""() => {
          const a=document.querySelector('#reading'),
                b=document.querySelector('#architecture');
          return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        }"""), "D16理论必须出现在工程架构和完整代码之前"
        assert "世界坐标" in page.locator("#reading").inner_text()
        assert "先自己想" in page.locator("#reading").inner_text()
        assert "3×3" in page.locator("#reading").inner_text()
        unit=page.locator("#reading [data-diagram='unit-circle']").first
        assert "θ = 30°" in unit.locator("svg").text_content()
        unit.locator("button[data-angle='90']").click()
        assert unit.locator("button[data-angle='90']").get_attribute("aria-pressed")=="true"
        assert "θ = 90°" in unit.locator("svg").text_content()
        unit.locator("button[data-angle='180']").click()
        assert "θ = 180°" in unit.locator("svg").text_content()
        # 图文之后可直接跳到相应的Python代码段。
        page.locator("#d16-concept-4 .d16-code-jump").click()
        assert "构造2×2旋转矩阵" in page.locator("#stepTitle").inner_text()
        assert page.locator("#fileTabs button[data-file]").count() == 7
        page.locator("#fileTabs button[data-file='geometry2d.py']").click()
        assert "def rotation_deg" in page.locator("#code").inner_text()
        assert page.locator("#codeNotes").count() == 1

        # 原架构个人源码副本修改后切文件再回，应仍是个人内容。
        page.locator("#editCodeNotes").click()
        page.locator("#codeNotes").fill("# 我的D16副本批注：@是矩阵乘法。")
        page.locator("#fileTabs button[data-file='demo.py']").click()
        page.locator("#fileTabs button[data-file='geometry2d.py']").click()
        page.locator("#editCodeNotes").click()
        assert "我的D16副本批注" in page.locator("#codeNotes").input_value()

        page.locator("#tab-run").click()
        for scenario in range(7):
            page.locator("#scenario").select_option(str(scenario))
            page.locator("#runButton").click()
            page.wait_for_function(
                "(n)=>document.querySelector('#output')?.textContent.includes('S'+String(n+1).padStart(2,'0'))",
                arg=scenario)
            text = page.locator("#output").inner_text()
            assert "status" in text and "valid" in text, (scenario,text[:400])
            if scenario in (3, 5):
                assert "valid" in text and "0" in text
                assert page.locator("#output svg").count() == 0
            else:
                assert page.locator("#output svg").count() == 1
            if scenario == 6:
                assert "地标编号" in text and "世界x_W" in text
            if scenario == 2:
                assert "交换矩阵顺序后的坐标" in text
        # 真实资源打包：ZIP应该恰好7个可读取原始Python文件。
        page.locator("#tab-learn").click()
        with page.expect_download() as transfer:
            page.locator("#downloadProject").click()
        download = transfer.value
        with zipfile.ZipFile(download.path()) as package:
            names = package.namelist()
            assert len(names) == 7, names
            assert package.testzip() is None
            assert any(x.endswith("/geometry2d.py") for x in names)
            assert b"def rotation_deg" in package.read(
                next(x for x in names if x.endswith("/geometry2d.py")))

        # 新D16的笔记不会覆盖D15的原记录，刷新后个人源码仍在。
        page.locator("#tab-learn").click()
        page.locator("#notes").fill("D16：我理解了R@p再加t。")
        page.locator("#saveNotes").click()
        page.wait_for_function("""() => {
          const s=localStorage.getItem('asw-pages-v1:/');
          return s && JSON.parse(s).notes.some(n=>n.day===16 && n.notes.includes('D16：我理解'));
        }""")
        prev = page.evaluate("""() => JSON.parse(localStorage.getItem('asw-pages-v1:/'))""")
        assert next(x for x in prev["notes"] if x["day"] == 15)["notes"].startswith("D15浏览器通过")
        assert len(prev["progress"]) == 15
        page.reload(wait_until="networkidle")
        page.wait_for_function("document.querySelector('#courseStatus')?.textContent.includes('D16')")
        page.wait_for_function("document.querySelector('#notes')?.value.includes('D16：我理解')")
        assert "D16：我理解" in page.locator("#notes").input_value()
        page.locator("#fileTabs button[data-file='geometry2d.py']").click()
        page.locator("#editCodeNotes").click()
        assert "我的D16副本批注" in page.locator("#codeNotes").input_value()
        # 手机布局：SVG允许在图自己的容器内滚动，而不撑宽整个页面。
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(250)
        sizes=page.evaluate("""() => ({
          viewport:window.innerWidth,
          width:document.documentElement.scrollWidth,
          fig:document.querySelector('.d16-figure-canvas').scrollWidth,
          box:document.querySelector('.d16-figure-canvas').clientWidth
        })""")
        assert sizes["width"] <= sizes["viewport"] + 2, sizes
        assert sizes["fig"] >= sizes["box"], sizes
        assert not js_errors, js_errors
        print("PASS D16 theory-first browser: 14 concepts, interactive SVG, 7 cases, ZIP, mobile and saved notes")
        browser.close()


if __name__ == "__main__":
    main()
