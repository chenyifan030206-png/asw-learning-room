"""D17真正Chromium验收：理论阅读顺序、八案例图示、源码下载及个人笔记。"""
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
            notes:[{day:16,notes:'D16列向量：A@R@p先旋转再平移',
               feedback:'',annotations:'[]',file_notes:'{}',
               updated:'2026-11-23T00:00:00Z'}],
            progress:Array.from({length:16},(_,i)=>({
              day:i+1,method:'test',detail:'浏览器在线练习',
              updated:'2026-11-23T00:00:00Z'
            })),
            attempts:[],runs:[]
          };
          localStorage.setItem('asw-pages-v1:/',JSON.stringify(data));
        })()""")
        page.goto("http://127.0.0.1:8765/index.html", wait_until="networkidle")
        page.wait_for_function("document.querySelector('#courseStatus')?.textContent.includes('D17')")
        assert "微积分与离散时间" in page.locator("#title").inner_text()
        assert page.locator("#reading .d17-concept").count() == 14
        assert page.locator("#reading .d17-figure svg").count() == 14
        assert page.locator("#reading .d17-links a").count() == 14
        assert page.evaluate("""() => {
          const theory=document.querySelector('#reading'), code=document.querySelector('#architecture');
          return !!(theory.compareDocumentPosition(code) & Node.DOCUMENT_POSITION_FOLLOWING);
        }"""), "D17理论与图示必须在代码和工程架构之前"
        dt=page.locator("#reading [data-diagram='compare_dt']")
        assert dt.count()==1
        assert "23.8m" in dt.locator("svg").text_content()
        dt.locator("button[data-dt='0.05']").click()
        assert "23.9m" in dt.locator("svg").text_content()
        assert dt.locator("button[data-dt='0.05']").get_attribute("aria-pressed")=="true"
        noise=page.locator("#reading [data-diagram='noise']")
        assert "2 m/s²" in noise.locator("svg").text_content()
        noise.locator("button[data-dt='0.05']").click()
        assert "4 m/s²" in noise.locator("svg").text_content()
        page.locator("#d17-concept-8 .d17-code-jump").click()
        assert "差分加速度" in page.locator("#stepTitle").inner_text()

        assert page.locator("#fileTabs button[data-file]").count()==7
        page.locator("#fileTabs button[data-file='calculus.py']").click()
        assert "def checked_series" in page.locator("#code").inner_text()
        page.locator("#editCodeNotes").click()
        page.locator("#codeNotes").fill(
            "# 我的D17源码批注：np.diff(t)求相邻时间戳差。")
        page.locator("#fileTabs button[data-file='demo.py']").click()
        page.locator("#fileTabs button[data-file='calculus.py']").click()
        page.locator("#editCodeNotes").click()
        assert "我的D17源码批注" in page.locator("#codeNotes").input_value()

        page.locator("#tab-run").click()
        for scenario in range(8):
            page.locator("#scenario").select_option(str(scenario))
            page.locator("#runButton").click()
            page.wait_for_function("""n => {
              const output=document.querySelector('#output')?.textContent||'';
              return output.includes('S'+String(n+1).padStart(2,'0'));
            }""", arg=scenario)
            output=page.locator("#output").inner_text()
            assert "status" in output and "valid" in output,scenario
            if scenario==7:
                assert page.locator("[data-role='day17-chart']").count()==0
                assert "时间戳" in output
            else:
                assert page.locator("[data-role='day17-chart']").count()==3,scenario
                assert "速度样本数" in output
                assert "左矩形累计位移" in output
                assert "梯形累计位移" in output
                assert "差分加速度" in output
        page.locator("#tab-learn").click()
        with page.expect_download() as transfer:
            page.locator("#downloadProject").click()
        with zipfile.ZipFile(transfer.value.path()) as z:
            assert z.testzip() is None
            assert len(z.namelist())==7
            names=z.namelist()
            assert any(n.endswith("/calculus.py") for n in names)
            assert b"def checked_series" in z.read(next(n for n in names if n.endswith("/calculus.py")))

        page.locator("#notes").fill("D17：积分是面积，差分是速度变化除以真实dt。")
        page.locator("#saveNotes").click()
        page.wait_for_function("""() => {
          const db=JSON.parse(localStorage.getItem('asw-pages-v1:/'));
          return db.notes.some(n=>n.day===17&&n.notes.includes('D17：积分是面积'));
        }""")
        original=page.evaluate("() => JSON.parse(localStorage.getItem('asw-pages-v1:/'))")
        assert next(x for x in original["notes"] if x["day"]==16)["notes"].startswith("D16列向量")
        assert len(original["progress"])==16

        page.reload(wait_until="networkidle")
        page.wait_for_function("document.querySelector('#notes')?.value.includes('D17：积分是面积')")
        page.locator("#fileTabs button[data-file='calculus.py']").click()
        page.locator("#editCodeNotes").click()
        assert "我的D17源码批注" in page.locator("#codeNotes").input_value()

        page.set_viewport_size({"width": 390, "height": 844})
        sizes=page.evaluate("""() => ({
          vp:innerWidth,w:document.documentElement.scrollWidth,
          graph:document.querySelector('.d17-figure-canvas').scrollWidth,
          container:document.querySelector('.d17-figure-canvas').clientWidth
        })""")
        assert sizes["w"]<=sizes["vp"]+2,sizes
        assert sizes["graph"]>=sizes["container"],sizes
        assert not errors,errors
        print("PASS D17 real Chromium: 14 theory figures, dt interaction, eight scenarios, three plots, ZIP, notes and mobile")
        browser.close()


if __name__=="__main__":
    run()
