"""D18真正Chromium验收：理论阅读顺序、八案例图示、源码下载及个人笔记。"""
import zipfile
from playwright.sync_api import sync_playwright


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1300, "height": 900},
                                accept_downloads=True)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.add_init_script("""(() => {
          if (localStorage.getItem('asw-pages-v1:/')) return;
          const data={
            notes:[{day:17,notes:'D17误差和噪声的关系',
               feedback:'',annotations:'[]',file_notes:'{}',
               updated:'2026-11-23T00:00:00Z'}],
            progress:Array.from({length:17},(_,i)=>({
              day:i+1,method:'test',detail:'浏览器在线练习',
              updated:'2026-11-23T00:00:00Z'
            })),
            attempts:[],runs:[]
          };
          localStorage.setItem('asw-pages-v1:/',JSON.stringify(data));
        })()""")
        page.goto("http://127.0.0.1:8765/index.html", wait_until="networkidle")
        page.wait_for_function("document.querySelector('#courseStatus')?.textContent.includes('D18')")
        assert "概率与低通滤波" in page.locator("#title").inner_text()
        assert page.locator("#reading .d17-concept").count() == 12
        assert page.locator("#reading .d17-figure svg").count() == 12
        assert page.locator("#reading .d17-links a").count() == 12
        assert page.evaluate("""() => {
          const theory=document.querySelector('#reading'), code=document.querySelector('#architecture');
          return !!(theory.compareDocumentPosition(code) & Node.DOCUMENT_POSITION_FOLLOWING);
        }"""), "D18理论与图示必须在代码和工程架构之前"
        dt=page.locator("#reading [data-diagram='step']").first
        assert "2.1 s" in dt.locator("svg").text_content()
        dt.locator("button[data-alpha='0.8']").click()
        assert "0.1 s" in dt.locator("svg").text_content()
        assert dt.locator("button[data-alpha='0.8']").get_attribute("aria-pressed")=="true"
        page.locator("#d18-concept-7 .d17-code-jump").click()
        assert "一阶滤波" in page.locator("#stepTitle").inner_text()
        assert page.locator("#fileTabs button[data-file='FUNCTION_GUIDE.md']").count()==1
        page.locator("#fileTabs button[data-file='FUNCTION_GUIDE.md']").click()
        assert "np.flatnonzero" in page.locator("#code").inner_text()

        assert page.locator("#fileTabs button[data-file]").count()==7
        page.locator("#fileTabs button[data-file='filtering.py']").click()
        assert "def lowpass" in page.locator("#code").inner_text()
        page.locator("#editCodeNotes").click()
        page.locator("#codeNotes").fill(
            "# 我的D18源码批注：np.empty_like创建未初始化数组。")
        page.locator("#fileTabs button[data-file='demo.py']").click()
        page.locator("#fileTabs button[data-file='filtering.py']").click()
        page.locator("#editCodeNotes").click()
        assert "我的D18源码批注" in page.locator("#codeNotes").input_value()

        page.locator("#tab-run").click()
        for scenario in range(7):
            page.locator("#scenario").select_option(str(scenario))
            page.locator("#runButton").click()
            page.wait_for_function("""n => {
              const output=document.querySelector('#output')?.textContent||'';
              return output.includes('S'+String(n+1).padStart(2,'0'));
            }""", arg=scenario)
            output=page.locator("#output").inner_text()
            assert "status" in output and "valid" in output,scenario
            if scenario==6:
                assert page.locator("[data-role='day18-chart']").count()==0
                assert "alpha" in output
            else:
                assert page.locator("[data-role='day18-chart']").count()==2,scenario
                assert "原始方差" in output
                assert "滤后方差" in output
                assert "上升时间" in output
                assert "RMSE" in output
        page.locator("#tab-learn").click()
        with page.expect_download() as transfer:
            page.locator("#downloadProject").click()
        with zipfile.ZipFile(transfer.value.path()) as z:
            assert z.testzip() is None
            assert len(z.namelist())==7
            names=z.namelist()
            assert any(n.endswith("/FUNCTION_GUIDE.md") for n in names)
            assert b"np.flatnonzero" in z.read(next(n for n in names if n.endswith("/FUNCTION_GUIDE.md")))
            assert any(n.endswith("/filtering.py") for n in names)
            assert b"def lowpass" in z.read(next(n for n in names if n.endswith("/filtering.py")))

        page.locator("#notes").fill("D18：方差与响应速度需要一起评价。")
        page.locator("#saveNotes").click()
        page.wait_for_function("""() => {
          const db=JSON.parse(localStorage.getItem('asw-pages-v1:/'));
          return db.notes.some(n=>n.day===18&&n.notes.includes('D18：方差与响应速度'));
        }""")
        original=page.evaluate("() => JSON.parse(localStorage.getItem('asw-pages-v1:/'))")
        assert next(x for x in original["notes"] if x["day"]==17)["notes"].startswith("D17误差和噪声")
        assert len(original["progress"])==17

        page.reload(wait_until="networkidle")
        page.wait_for_function("document.querySelector('#notes')?.value.includes('D18：方差与响应速度')")
        page.locator("#fileTabs button[data-file='filtering.py']").click()
        page.locator("#editCodeNotes").click()
        assert "我的D18源码批注" in page.locator("#codeNotes").input_value()

        page.set_viewport_size({"width": 390, "height": 844})
        sizes=page.evaluate("""() => ({
          vp:innerWidth,w:document.documentElement.scrollWidth,
          graph:document.querySelector('.d17-figure-canvas').scrollWidth,
          container:document.querySelector('.d17-figure-canvas').clientWidth
        })""")
        assert sizes["w"]<=sizes["vp"]+2,sizes
        assert sizes["graph"]>=sizes["container"],sizes
        assert not errors,errors
        print("PASS D18 real Chromium: 14 theory figures, dt interaction, eight scenarios, three plots, ZIP, notes and mobile")
        browser.close()


if __name__=="__main__":
    run()
